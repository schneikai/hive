import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { useRightButtonDrag } from './useRightButtonDrag'

function Card({
  onDrop,
  enabled = true,
  decorateGhost
}: {
  onDrop: (c: string | null) => void
  enabled?: boolean
  decorateGhost?: (ghost: HTMLElement) => void
}) {
  const drag = useRightButtonDrag({ enabled, onDrop, decorateGhost })
  return (
    <div>
      <div
        data-testid="card"
        onMouseDown={drag.onMouseDown}
        onContextMenuCapture={drag.onContextMenuCapture}
        onContextMenu={() => onDrop('__menu__')}
      >
        card
      </div>
      <div data-testid="target" data-kanban-column="in_progress">
        target
      </div>
    </div>
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('useRightButtonDrag', () => {
  it('reports the column under the pointer after a right-button drag', () => {
    const onDrop = vi.fn()
    const { getByTestId } = render(<Card onDrop={onDrop} />)
    const card = getByTestId('card')
    const target = getByTestId('target')
    // jsdom has no layout — stub hit-testing
    document.elementFromPoint = () => target

    fireEvent.mouseDown(card, { button: 2, clientX: 10, clientY: 10 })
    fireEvent.contextMenu(card, { clientX: 10, clientY: 10 }) // macOS: fires on press
    fireEvent.mouseMove(window, { clientX: 80, clientY: 60 })
    fireEvent.mouseUp(window, { button: 2, clientX: 80, clientY: 60 })

    expect(onDrop).toHaveBeenCalledTimes(1)
    expect(onDrop).toHaveBeenCalledWith('in_progress')
    // Post-mouseup contextmenu (Windows/Linux) is suppressed after a drag
    fireEvent.contextMenu(card, { clientX: 80, clientY: 60 })
    expect(onDrop).toHaveBeenCalledTimes(1)
  })

  it('replays the context menu for a plain right click', () => {
    const onDrop = vi.fn()
    const { getByTestId } = render(<Card onDrop={onDrop} />)
    const card = getByTestId('card')

    fireEvent.mouseDown(card, { button: 2, clientX: 10, clientY: 10 })
    fireEvent.contextMenu(card, { clientX: 10, clientY: 10 })
    expect(onDrop).not.toHaveBeenCalled() // swallowed while the button is held
    fireEvent.mouseUp(window, { button: 2, clientX: 10, clientY: 10 })

    expect(onDrop).toHaveBeenCalledTimes(1)
    expect(onDrop).toHaveBeenCalledWith('__menu__')
  })

  it('lets the caller decorate the ghost once it becomes a drag', () => {
    const decorateGhost = vi.fn((ghost: HTMLElement) => {
      const chip = document.createElement('div')
      chip.setAttribute('data-testid', 'chip')
      ghost.appendChild(chip)
    })
    const { getByTestId } = render(<Card onDrop={vi.fn()} decorateGhost={decorateGhost} />)
    const card = getByTestId('card')

    fireEvent.mouseDown(card, { button: 2, clientX: 10, clientY: 10 })
    expect(decorateGhost).not.toHaveBeenCalled() // press alone is not a drag
    fireEvent.mouseMove(window, { clientX: 80, clientY: 60 })
    expect(decorateGhost).toHaveBeenCalledTimes(1)
    const chip = document.querySelector('[data-testid="chip"]')
    expect(chip).not.toBeNull()
    expect(chip!.parentElement).toBe(decorateGhost.mock.calls[0][0])
    expect(document.body.contains(chip)).toBe(true) // ghost (and chip) mounted while dragging
    fireEvent.mouseMove(window, { clientX: 90, clientY: 70 })
    expect(decorateGhost).toHaveBeenCalledTimes(1) // not re-decorated per move
    fireEvent.mouseUp(window, { button: 2, clientX: 90, clientY: 70 })
    expect(document.querySelector('[data-testid="chip"]')).toBeNull() // ghost removed on release
  })

  it('leaves left-button presses alone', () => {
    const onDrop = vi.fn()
    const { getByTestId } = render(<Card onDrop={onDrop} />)
    const card = getByTestId('card')
    fireEvent.mouseDown(card, { button: 0, clientX: 10, clientY: 10 })
    fireEvent.mouseMove(window, { clientX: 80, clientY: 60 })
    fireEvent.mouseUp(window, { button: 0, clientX: 80, clientY: 60 })
    expect(onDrop).not.toHaveBeenCalled()
  })
})
