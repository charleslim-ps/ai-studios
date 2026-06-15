// Linear GraphQL — the plan layer. project status → roadmap, issues → todos.
// Personal API key is sent raw in the Authorization header (no "Bearer").
import type { RoadmapItem, Todo } from "../types";

const ENDPOINT = "https://api.linear.app/graphql";

const QUERY = `
  query Project($id: String!) {
    project(id: $id) {
      name
      state
      projectMilestones(first: 20) { nodes { name } }
      issues(first: 50) {
        nodes {
          title
          priority
          url
          state { name type }
        }
      }
    }
  }
`;

export interface LinearData {
  roadmap: RoadmapItem[];
  todos: Todo[];
}

interface LinearIssue {
  title: string;
  priority: number;
  url: string;
  state: { name: string; type: string };
}

export async function fetchLinear(projectId: string, apiKey: string): Promise<LinearData> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: apiKey },
    body: JSON.stringify({ query: QUERY, variables: { id: projectId } }),
  });
  if (!res.ok) throw new Error(`Linear ${res.status} for project ${projectId}`);

  const json = (await res.json()) as {
    data?: { project?: { name: string; state: string; projectMilestones: { nodes: { name: string }[] }; issues: { nodes: LinearIssue[] } } };
    errors?: { message: string }[];
  };
  if (json.errors?.length) throw new Error(`Linear errors: ${json.errors.map((e) => e.message).join("; ")}`);
  const project = json.data?.project;
  if (!project) throw new Error(`Linear project ${projectId} not found`);

  const milestones = project.projectMilestones?.nodes ?? [];
  const roadmap: RoadmapItem[] =
    milestones.length > 0
      ? milestones.map((m) => ({ title: m.name, state: project.state }))
      : [{ title: project.name, state: project.state }];

  // Open todos only (not completed/canceled), urgent first.
  const todos: Todo[] = (project.issues?.nodes ?? [])
    .filter((i) => i.state.type !== "completed" && i.state.type !== "canceled")
    .map((i) => ({
      title: i.title,
      state: i.state.type,
      priority: i.priority,
      link: i.url,
    }))
    .sort((a, b) => (a.priority || 9) - (b.priority || 9));

  return { roadmap, todos };
}
