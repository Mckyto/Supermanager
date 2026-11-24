#!/usr/bin/env bash
# A newly uploaded artifact can take time to become visible to the deployment API.
set -euo pipefail
: "${GITHUB_REPOSITORY:?}" "${GITHUB_RUN_ID:?}" "${ARTIFACT_ID:?}"
[[ "$ARTIFACT_ID" =~ ^[0-9]+$ ]] || { echo '::error::Invalid uploaded artifact ID.'; exit 1; }
for attempt in $(seq 1 12); do
  if artifacts=$(gh api --paginate "repos/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}/artifacts?per_page=100" --jq '.artifacts[] | select(.name == "github-pages" and .expired == false) | .id' 2>/dev/null); then
    if [[ "$artifacts" == "$ARTIFACT_ID" ]]; then
      echo "Pages artifact $ARTIFACT_ID is visible."
      exit 0
    fi
    echo "Attempt $attempt: expected artifact $ARTIFACT_ID, visible IDs: ${artifacts:-none}."
  else
    echo "Attempt $attempt: artifact API unavailable."
  fi
  if (( attempt < 12 )); then sleep 10; fi
done
echo '::error::Uploaded Pages artifact was not uniquely visible before the deadline.'
exit 1
