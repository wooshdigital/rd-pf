import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private get apiUrl() {
    return process.env.RD_AIC_URL || 'https://ai-center.roochedigital.com';
  }

  private get apiKey() {
    return process.env.RD_AIC_API_KEY || '';
  }

  private async callApi(body: Record<string, any>) {
    if (!this.apiKey) {
      throw new Error('RD_AIC_API_KEY is not configured');
    }

    // Enforce JSON output via system prompt
    if (!body.system) {
      body.system = 'You are a JSON API. You MUST respond with ONLY valid JSON — no markdown fences, no preamble, no explanation. Your entire response must be parseable by JSON.parse().';
    }

    this.logger.log(`→ POST ${this.apiUrl}/v1/messages (model: ${body.model}, web_search: ${!!body.web_search})`);
    const start = Date.now();

    const resp = await fetch(`${this.apiUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      this.logger.error(`← ${resp.status} after ${elapsed}s: ${JSON.stringify(err)}`);
      throw new Error(err.error?.message || err.error || `API error: ${resp.status}`);
    }

    this.logger.log(`← 200 OK after ${elapsed}s`);
    return resp.json();
  }

  private readonly ANALYZE_PROMPT = `You are analyzing a resume to generate matching fake GitHub projects for a hiring research case study.

Extract the following from this resume and return ONLY valid JSON (no markdown fences):

{
  "name": "person's full name",
  "skills": ["skill1", "skill2", ...],
  "timeline": [
    {
      "role": "job title",
      "org": "company name",
      "start": "YYYY-MM",
      "end": "YYYY-MM or present",
      "skills": ["relevant", "tech", "used"]
    }
  ],
  "projects": [
    {
      "name": "repo-name-in-kebab-case",
      "description": "1-2 sentence description",
      "tech": ["main", "technologies"],
      "start": "YYYY-MM",
      "end": "YYYY-MM",
      "matchesRole": "which timeline role this supports",
      "complexity": "small|medium|large"
    }
  ]
}

Generate 3-5 project ideas that:
- Use the technologies mentioned in the resume
- Have realistic start/end dates that fall WITHIN the employment periods
- Look like genuine side projects or work-related tools a person in that role would build
- Have natural repo names (not "demo" or "tutorial" — think real projects)`;

  private parseAiResponse(resp: any) {
    // Find the text block (skip tool_use blocks from web_search)
    const textBlock = resp.content.find((b: any) => b.type === 'text');
    if (!textBlock) throw new Error('No text content in AI response');
    const text = textBlock.text;

    // Strip markdown fences
    let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // If not valid JSON, extract the JSON object from surrounding text
    try {
      return JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/{[\s\S]*}/);
      if (m) return JSON.parse(m[0]);
      throw new Error('Could not extract JSON from AI response');
    }
  }

  async analyzeResumeFile(base64Data: string, mediaType: string, webSearch?: boolean) {
    const resp = await this.callApi({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      ...(webSearch && { web_search: true }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: this.ANALYZE_PROMPT,
            },
          ],
        },
      ],
    });

    return this.parseAiResponse(resp);
  }

  async analyzeResume(resumeText: string, webSearch?: boolean) {
    const resp = await this.callApi({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      ...(webSearch && { web_search: true }),
      messages: [
        {
          role: 'user',
          content: `${this.ANALYZE_PROMPT}\n\nRESUME:\n${resumeText}`,
        },
      ],
    });

    return this.parseAiResponse(resp);
  }

  async generateProject(project: any, webSearch?: boolean) {
    const resp = await this.callApi({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      ...(webSearch && { web_search: true }),
      messages: [
        {
          role: 'user',
          content: `Generate realistic source code files for this GitHub project. This is for a hiring research case study.

PROJECT:
- Name: ${project.name}
- Description: ${project.description}
- Technologies: ${project.tech.join(', ')}
- Complexity: ${project.complexity}

Return ONLY valid JSON (no markdown fences) in this format:
{
  "files": {
    "relative/path/filename.ext": "file contents here",
    ...
  },
  "commitOrder": [
    {
      "phase": "init",
      "description": "Initial project setup",
      "files": ["package.json", "README.md", ".gitignore"],
      "weight": 0.05
    },
    {
      "phase": "core",
      "description": "Core feature implementation",
      "files": ["src/index.js", "src/utils.js"],
      "weight": 0.4
    },
    ...
  ]
}

Rules:
- Generate real, working code — not placeholder lorem ipsum
- Include package.json (or equivalent), README.md, .gitignore
- For a "small" project: 5-8 files. "medium": 8-15 files. "large": 15-25 files
- README should look natural with install/usage sections
- Code should have realistic variable names, comments, error handling
- commitOrder defines the phases in which files should be committed chronologically
  - "weight" is the fraction of total project time this phase should span (all weights sum to 1.0)
  - Each phase represents a logical development milestone
  - Generate 4-8 phases to make the commit history look natural`,
        },
      ],
    });

    return this.parseAiResponse(resp);
  }
}
