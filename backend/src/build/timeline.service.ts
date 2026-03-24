import { Injectable } from '@nestjs/common';
import moment from 'moment';

interface CommitPlanEntry {
  date: string;
  message: string;
  files: Record<string, string>;
}

@Injectable()
export class TimelineService {
  buildCommitPlan(
    generated: { files: Record<string, string>; commitOrder: any[] },
    timeline: { start: string; end: string },
  ): CommitPlanEntry[] {
    const { files, commitOrder } = generated;
    const start = moment(timeline.start, 'YYYY-MM').startOf('month');
    const end =
      timeline.end === 'present'
        ? moment()
        : moment(timeline.end, 'YYYY-MM').endOf('month');

    const totalDays = end.diff(start, 'days');
    if (totalDays <= 0) return [];

    // Step 1: Break files into small, granular work units
    const workUnits = this.buildWorkUnits(files, commitOrder);

    // Step 2: Generate realistic weekday work schedule
    const workdays = this.generateWorkdays(start, end);

    // Step 3: Distribute work units across workdays with realistic patterns
    const commits = this.distributeWork(workUnits, workdays);

    commits.sort((a, b) => moment(a.date).valueOf() - moment(b.date).valueOf());
    return commits;
  }

  /**
   * Break files into small work units that mimic real development.
   * Instead of committing whole files, split large files into chunks
   * and create incremental versions.
   */
  private buildWorkUnits(
    files: Record<string, string>,
    commitOrder: any[],
  ): { files: Record<string, string>; phase: string; description: string }[] {
    const units: { files: Record<string, string>; phase: string; description: string }[] = [];

    for (const phase of commitOrder) {
      const phaseFiles: string[] = phase.files.filter((f: string) => files[f]);
      if (phaseFiles.length === 0) continue;

      if (phase.phase === 'init') {
        // Init is always one commit
        const initFiles: Record<string, string> = {};
        for (const f of phaseFiles) initFiles[f] = files[f];
        units.push({ files: initFiles, phase: phase.phase, description: phase.description });
        continue;
      }

      // Break each file into its own commit, or split large files into multiple
      for (const filePath of phaseFiles) {
        const content = files[filePath];
        const lines = content.split('\n');

        if (lines.length > 80 && Math.random() > 0.4) {
          // Split large files into 2-3 incremental commits
          const splits = this.randInt(2, 3);
          const chunkSize = Math.ceil(lines.length / splits);

          for (let s = 0; s < splits; s++) {
            const partial = lines.slice(0, chunkSize * (s + 1)).join('\n');
            const desc =
              s === 0
                ? this.basename(filePath)
                : s === splits - 1
                  ? this.basename(filePath)
                  : this.basename(filePath);
            const verb =
              s === 0 ? 'scaffold' : s === splits - 1 ? 'finish' : 'extend';
            units.push({
              files: { [filePath]: partial },
              phase: '_raw',
              description: `${verb} ${desc}`,
            });
          }
        } else {
          units.push({
            files: { [filePath]: content },
            phase: phase.phase,
            description: this.basename(filePath),
          });
        }
      }
    }

    return units;
  }

  /**
   * Generate realistic workday schedule:
   * - Mostly weekdays
   * - Occasional weekend work (~15%)
   * - Skip some days to simulate real work patterns (not every single day)
   */
  private generateWorkdays(start: moment.Moment, end: moment.Moment): moment.Moment[] {
    const days: moment.Moment[] = [];
    const current = start.clone().add(1, 'day');

    while (current.isBefore(end)) {
      const isWeekend = current.day() === 0 || current.day() === 6;

      if (isWeekend) {
        // 15% chance to work on weekends
        if (Math.random() < 0.15) {
          days.push(current.clone());
        }
      } else {
        // 60% chance to commit on any given weekday (devs don't commit every single day)
        if (Math.random() < 0.6) {
          days.push(current.clone());
        }
      }

      current.add(1, 'day');
    }

    return days;
  }

  /**
   * Distribute work units across available workdays.
   * Some days get 1 commit, some get 2-3 (productive days).
   */
  private distributeWork(
    workUnits: { files: Record<string, string>; phase: string; description: string }[],
    workdays: moment.Moment[],
  ): CommitPlanEntry[] {
    if (workdays.length === 0 || workUnits.length === 0) return [];

    const commits: CommitPlanEntry[] = [];
    let unitIndex = 0;

    // Calculate how many workdays per unit
    const ratio = workdays.length / workUnits.length;

    for (let i = 0; i < workUnits.length; i++) {
      const unit = workUnits[i];

      // Pick the workday for this unit
      const dayIndex = Math.min(
        Math.floor(i * ratio + this.randInt(0, Math.max(0, Math.floor(ratio * 0.3)))),
        workdays.length - 1,
      );
      const day = workdays[dayIndex];

      // Realistic commit time: most between 9am-6pm, some evening work
      const hour = Math.random() < 0.8
        ? this.randInt(9, 18)   // Normal work hours
        : this.randInt(19, 23); // Evening coding
      const minute = this.randInt(0, 59);
      const second = this.randInt(0, 59);

      const commitDate = day
        .clone()
        .hour(hour)
        .minute(minute)
        .second(second);

      const message = this.buildCommitMessage(unit.phase, unit.description);

      commits.push({
        date: commitDate.format('YYYY-MM-DDTHH:mm:ss'),
        message,
        files: unit.files,
      });
    }

    // Add maintenance/fix commits scattered throughout
    const extras = this.generateMaintenanceCommits(
      workUnits.reduce((acc, u) => ({ ...acc, ...u.files }), {}),
      workdays,
    );
    commits.push(...extras);

    return commits;
  }

  private buildCommitMessage(phase: string, description: string): string {
    if (phase === 'init') return 'Initial commit';
    if (phase === '_raw') return description;

    // Natural, varied commit messages
    const templates: Record<string, string[]> = {
      core: [
        'add {desc}',
        'implement {desc}',
        'set up {desc}',
        'create {desc}',
      ],
      feature: [
        'add {desc}',
        'implement {desc}',
        'feat: {desc}',
        'create {desc}',
      ],
      refactor: [
        'refactor {desc}',
        'clean up {desc}',
        'simplify {desc}',
        'reorganize {desc}',
      ],
      test: [
        'add tests for {desc}',
        'test {desc}',
        'write unit tests for {desc}',
      ],
      docs: [
        'update {desc}',
        'add docs for {desc}',
        'document {desc}',
      ],
      fix: [
        'fix {desc}',
        'resolve issue in {desc}',
        'patch {desc}',
      ],
      style: [
        'style {desc}',
        'update styles for {desc}',
        'improve UI of {desc}',
      ],
      config: [
        'configure {desc}',
        'update config for {desc}',
        'set up {desc}',
      ],
    };

    const pool = templates[phase] || templates.core;
    const template = pool[this.randInt(0, pool.length - 1)];
    return template.replace('{desc}', description.toLowerCase());
  }

  private generateMaintenanceCommits(
    allFiles: Record<string, string>,
    workdays: moment.Moment[],
  ): CommitPlanEntry[] {
    if (workdays.length < 5) return [];

    const extras: CommitPlanEntry[] = [];
    const fileList = Object.keys(allFiles);
    const numExtras = this.randInt(3, Math.min(8, Math.floor(workdays.length * 0.1)));

    const fixMessages = [
      'fix typo in',
      'update',
      'minor fix in',
      'fix import in',
      'adjust formatting in',
      'fix edge case in',
      'update deps',
      'lint fix',
      'fix minor bug in',
      'clean up',
    ];

    for (let i = 0; i < numExtras; i++) {
      const randomFile = fileList[this.randInt(0, fileList.length - 1)];
      // Pick a workday from the second half (maintenance happens after initial dev)
      const dayIndex = this.randInt(Math.floor(workdays.length * 0.4), workdays.length - 1);
      const day = workdays[dayIndex];

      const hour = this.randInt(10, 20);
      const date = day
        .clone()
        .hour(hour)
        .minute(this.randInt(0, 59))
        .second(this.randInt(0, 59));

      let content = allFiles[randomFile];
      if (typeof content === 'string') {
        content = content + '\n';
      }

      const msg = fixMessages[this.randInt(0, fixMessages.length - 1)];
      extras.push({
        date: date.format('YYYY-MM-DDTHH:mm:ss'),
        message: `${msg} ${this.basename(randomFile)}`,
        files: { [randomFile]: content },
      });
    }

    return extras;
  }

  private basename(filePath: string): string {
    return filePath.split('/').pop() || filePath;
  }

  private randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
