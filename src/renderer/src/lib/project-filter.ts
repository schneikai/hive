import { subsequenceMatch, type SubsequenceMatch } from './subsequence-match'

export interface FilterableProject {
  id: string
  name: string
  path: string
  language: string | null
}

export interface ProjectFilterCriteria {
  filterQuery: string
  activeLanguages: string[]
  activeSpaceId: string | null
  projectSpaceMap: Record<string, string[]>
}

export interface FilteredProject<P extends FilterableProject> {
  project: P
  nameMatch: SubsequenceMatch | null
  pathMatch: SubsequenceMatch | null
}

/**
 * Applies the sidebar filter (space → language → subsequence query) to a project
 * list. When a query is present the result is sorted by match quality and each
 * entry carries the name/path match details for highlighting.
 */
export function filterProjects<P extends FilterableProject>(
  projects: P[],
  { filterQuery, activeLanguages, activeSpaceId, projectSpaceMap }: ProjectFilterCriteria
): FilteredProject<P>[] {
  let spaceFiltered = projects
  if (activeSpaceId !== null) {
    const allowedIds = new Set(
      Object.entries(projectSpaceMap)
        .filter(([, spaceIds]) => spaceIds.includes(activeSpaceId))
        .map(([projectId]) => projectId)
    )
    spaceFiltered = projects.filter((p) => allowedIds.has(p.id))
  }

  let langFiltered = spaceFiltered
  if (activeLanguages.length > 0) {
    const langSet = new Set(activeLanguages)
    langFiltered = spaceFiltered.filter((p) => p.language && langSet.has(p.language))
  }

  if (!filterQuery.trim())
    return langFiltered.map((p) => ({ project: p, nameMatch: null, pathMatch: null }))

  return langFiltered
    .map((project) => ({
      project,
      nameMatch: subsequenceMatch(filterQuery, project.name),
      pathMatch: subsequenceMatch(filterQuery, project.path)
    }))
    .filter(({ nameMatch, pathMatch }) => nameMatch.matched || pathMatch.matched)
    .sort((a, b) => {
      const aScore = a.nameMatch.matched ? a.nameMatch.score : a.pathMatch.score + 1000
      const bScore = b.nameMatch.matched ? b.nameMatch.score : b.pathMatch.score + 1000
      return aScore - bScore
    })
}
