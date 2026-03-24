import { Injectable } from '@nestjs/common';
import simpleGit from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';

const WORKSPACE = path.join(process.cwd(), 'workspace');

@Injectable()
export class RepoBuilderService {
  async createRepoWithCommits(config: {
    projectName: string;
    files: any;
    commitPlan: any[];
    githubUser: string;
    githubName: string;
    githubToken: string;
    log: (msg: string) => void;
  }) {
    const { projectName, commitPlan, githubUser, githubName, githubToken, log } = config;
    const repoDir = path.join(WORKSPACE, projectName);

    await fs.rm(repoDir, { recursive: true, force: true });
    await fs.mkdir(repoDir, { recursive: true });

    const git = simpleGit(repoDir);
    await git.init();
    await git.raw(['checkout', '-b', 'main']);

    await git.addConfig('user.name', githubName);
    await git.addConfig(
      'user.email',
      `${githubUser}@users.noreply.github.com`,
    );

    log(`Initialized repo: ${projectName}`);

    log('Creating GitHub repo...');
    const repoCreated = await this.createGitHubRepo(
      projectName,
      githubToken,
      log,
    );
    if (!repoCreated) {
      log('Repo may already exist, continuing...');
    }

    const remoteUrl = `https://${githubUser}:${githubToken}@github.com/${githubUser}/${projectName}.git`;
    await git.addRemote('origin', remoteUrl);

    log(`Processing ${commitPlan.length} commits...`);

    for (let i = 0; i < commitPlan.length; i++) {
      const commit = commitPlan[i];

      for (const [filePath, content] of Object.entries(commit.files)) {
        const fullPath = path.join(repoDir, filePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content as string, 'utf-8');
      }

      await git.add('.');

      const env = {
        GIT_AUTHOR_DATE: commit.date,
        GIT_COMMITTER_DATE: commit.date,
      };
      await git.env(env).commit(commit.message);

      if (i % 5 === 0 || i === commitPlan.length - 1) {
        log(
          `Committed ${i + 1}/${commitPlan.length}: "${commit.message}" (${commit.date.slice(0, 10)})`,
        );
      }
    }

    log('Pushing to GitHub...');
    await git.push('origin', 'main', ['--force']);
    log(`Done! → https://github.com/${githubUser}/${projectName}`);

    return { url: `https://github.com/${githubUser}/${projectName}` };
  }

  private async createGitHubRepo(
    name: string,
    token: string,
    log: (msg: string) => void,
  ): Promise<boolean> {
    try {
      const resp = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json',
        },
        body: JSON.stringify({
          name,
          private: false,
          auto_init: false,
          description: '',
        }),
      });

      if (resp.status === 201) {
        log(`GitHub repo created: ${name}`);
        return true;
      }

      const body = await resp.json();
      if (
        resp.status === 422 &&
        body.errors?.some((e: any) => e.message?.includes('already exists'))
      ) {
        return false;
      }

      log(`GitHub API response: ${resp.status} - ${JSON.stringify(body)}`);
      return false;
    } catch (err: any) {
      log(`GitHub API error: ${err.message}`);
      return false;
    }
  }
}
