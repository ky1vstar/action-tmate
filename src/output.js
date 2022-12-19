import * as core from '@actions/core';
import * as github from '@actions/github';

export async function outputSession(token, session) {
  const sha = github.context.sha;

  const octokit = github.getOctokit(token);

  core.debug(`tagging #${sha} with tag ${tag}`);
  const response = await octokit.rest.git.createRef({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    ref: `refs/tags/${session}`,
    sha: sha
  });

  if (201 !== response.status) {
    throw `Failed to create tag ref (status=${response.status})`;
  }
}
