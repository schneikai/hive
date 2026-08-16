import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { useRightButtonDrag } from './useRightButtonDrag'

function Card({
  onDrop,
  enabled = true
}: {
  onDrop: (c: string | null) => void
  enabled?: boolean
}) {
  const drag = useRightButtonDrag({ enabled, onDrop })
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
