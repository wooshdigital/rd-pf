import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

export interface PortfolioContent {
  name: string;
  title: string;
  headline: string;
  bio: string;
  aboutParagraph: string;
  headshot: string | null;
  skills: string[];
  projects: Array<{
    name: string;
    description: string;
    tech: string[];
    githubUrl: string;
  }>;
  experience: Array<{
    role: string;
    org: string;
    start: string;
    end: string;
  }>;
  contact: {
    email?: string;
    github?: string;
    linkedin?: string;
  };
}

export interface ThemeMeta {
  name: string;
  label: string;
  description: string;
}

@Injectable()
export class ThemesService implements OnModuleInit {
  private themes = new Map<string, Handlebars.TemplateDelegate>();

  private readonly meta: ThemeMeta[] = [
    {
      name: 'minimal',
      label: 'Minimal',
      description: 'Centered single-column, serif type, monochrome accent.',
    },
    {
      name: 'terminal',
      label: 'Terminal',
      description: 'Monospace, green-on-black CLI aesthetic with ASCII dividers.',
    },
    {
      name: 'card-grid',
      label: 'Card Grid',
      description: 'Bold colored hero with project and experience cards.',
    },
  ];

  onModuleInit() {
    const dir = path.join(__dirname, 'themes');
    for (const { name } of this.meta) {
      const file = path.join(dir, name, 'index.hbs');
      if (!fs.existsSync(file)) continue;
      const src = fs.readFileSync(file, 'utf8');
      this.themes.set(name, Handlebars.compile(src));
    }
  }

  list(): ThemeMeta[] {
    return this.meta;
  }

  render(themeName: string, content: PortfolioContent): string {
    const tpl = this.themes.get(themeName);
    if (!tpl) throw new NotFoundException(`Theme "${themeName}" not found`);
    return tpl(content);
  }
}
