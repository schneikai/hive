import { describe, it, expect } from 'vitest'
import { filterProjects } from '../project-filter'

const projects = [
  { id: 'a', name: 'alpha', path: '/code/alpha', language: 'typescript' },
  { id: 'b', name: 'beta', path: '/code/beta', language: 'python' },
  { id: 'c', name: 'gamma', path: '/work/gamma', language: null }
]

const base = { filterQuery: '', activeLanguages: [], activeSpaceId: null, projectSpaceMap: {} }

describe('filterProjects', () => {
  it('returns every project unmatched when there is no filter', () => {
    const result = filterProjects(projects, base)
    expect(result.map((r) => r.project.id)).toEqual(['a', 'b', 'c'])
    expect(result[0].nameMatch).toBeNull()
  })

  it('matches by name or path subsequence and sorts name matches first', () => {
    const result = filterProjects(projects, { ...base, filterQuery: 'wrk' })
    expect(result.map((r) => r.project.id)).toEqual(['c'])
    expect(result[0].pathMatch?.matched).toBe(true)

    const byName = filterProjects(projects, { ...base, filterQuery: 'a' })
    expect(byName[0].project.id).not.toBe('c')
    expect(byName.map((r) => r.project.id).sort()).toEqual(['a', 'b', 'c'])
  })

  it('applies language and space filters before the query', () => {
    expect(
      filterProjects(projects, { ...base, activeLanguages: ['python'] }).map((r) => r.project.id)
    ).toEqual(['b'])
    expect(
      filterProjects(projects, {
        ...base,
        activeSpaceId: 's1',
        projectSpaceMap: { a: ['s1'], c: ['s2'] },
        filterQuery: 'a'
      }).map((r) => r.project.id)
    ).toEqual(['a'])
  })
})
