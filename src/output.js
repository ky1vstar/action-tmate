import * as core from '@actions/core';
import * as github from '@actions/github';

export async function outputSession(token, session) {
  const sha = github.context.sha;

  const client = new github.GitHub(token);

  core.debug(`tagging #${sha} with tag ${tag}`);
  await client.git.createRef({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    ref: `refs/tags/${session}`,
    sha: sha
  });
}
