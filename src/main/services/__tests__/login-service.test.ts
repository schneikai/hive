import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loginCancel,
  loginStart,
  setLoginBrowserLauncherForTests,
  type BrowserContextLike,
  type ElementHandleLike,
  type PageLike
} from '../login-service'

vi.mock('fs/promises', () => ({
  mkdir: vi.fn(async () => undefined)
}))

vi.mock('../../db', () => ({
  getDatabase: vi.fn(() => ({
    getSavedUsageAccountByProviderEmail: vi.fn(() => null)
  }))
}))

vi.mock('../logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  })
}))

vi.mock('../account-store-claude', () => ({
  addClaudeAccount: vi.fn(async () => undefined)
}))

vi.mock('../account-store-codex', () => ({
  addCodexAccount: vi.fn(async () => ({ email: 'x@y.com' }))
}))

vi.mock('../saved-usage-orchestrator', () => ({
  listSavedAccounts: vi.fn(async () => []),
  fetchForSavedAccount: vi.fn(async () => undefined)
}))

interface FakeButton extends ElementHandleLike {
  click: ReturnType<typeof vi.fn>
}

function makeElement(label: string): FakeButton {
  return {
    click: vi.fn(async () => undefined),
    fill: vi.fn(async () => undefined),
    press: vi.fn(async () => undefined),
    innerText: vi.fn(async () => label),
    getAttribute: vi.fn(async () => null),
    isVisible: vi.fn(async () => true),
    isEnabled: vi.fn(async () => true)
  }
}

interface FakeDriver {
  context: BrowserContextLike
  page: PageLike
  emailInput: FakeButton
  buttons: FakeButton[]
}

function makeFakeDriver(options?: { hasEmailInput?: boolean; buttons?: FakeButton[] }): FakeDriver {
  const emailInput = makeElement('')
  const buttons = options?.buttons ?? []
  const page: PageLike = {
    goto: vi.fn(async () => undefined),
    on: vi.fn(),
    mainFrame: () => ({ url: () => 'about:blank' }),
    waitForSelector: vi.fn(async (selector: string) => {
      if (options?.hasEmailInput === false) throw new Error('timeout')
      return selector === 'input[type="email"]' ? emailInput : null
    }),
    $$: vi.fn(async () => buttons)
  }
  const context: BrowserContextLike = {
    pages: () => [page],
    newPage: async () => page,
    route: vi.fn(async () => undefined),
    on: vi.fn(),
    close: vi.fn(async () => undefined)
  }
  return { context, page, emailInput, buttons }
}

describe.runIf(process.platform === 'darwin')('loginStart email autofill', () => {
  let activeLoginId: string | null = null

  beforeEach(() => {
    activeLoginId = null
  })

  afterEach(async () => {
    if (activeLoginId) await loginCancel(activeLoginId)
    setLoginBrowserLauncherForTests(null)
    vi.clearAllMocks()
  })

  async function start(driver: FakeDriver, email?: string): Promise<string> {
    setLoginBrowserLauncherForTests(async () => driver.context)
    const { loginId } = await loginStart('anthropic', email)
    activeLoginId = loginId
    return loginId
  }

  it('fills the email and clicks the email submit button, skipping social buttons', async () => {
    const social = makeElement('Continue with Google')
    const submit = makeElement('Continue with email')
    const driver = makeFakeDriver({ buttons: [social, submit] })

    await start(driver, 'user@example.com')

    await vi.waitFor(() => expect(submit.click).toHaveBeenCalled())
    expect(driver.emailInput.fill).toHaveBeenCalledWith('user@example.com')
    expect(social.click).not.toHaveBeenCalled()
  })

  it('presses Enter on the input when no submit button is found', async () => {
    const driver = makeFakeDriver({ buttons: [makeElement('Continue with Google')] })

    await start(driver, 'user@example.com')

    await vi.waitFor(() => expect(driver.emailInput.press).toHaveBeenCalledWith('Enter'))
    expect(driver.emailInput.fill).toHaveBeenCalledWith('user@example.com')
  })

  it('does not touch the page when no email hint is given', async () => {
    const driver = makeFakeDriver()

    await start(driver)

    // Give any (buggy) fire-and-forget autofill a beat to run.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(driver.page.waitForSelector).not.toHaveBeenCalled()
    expect(driver.emailInput.fill).not.toHaveBeenCalled()
  })

  it('leaves the login waiting when the email field never appears', async () => {
    const driver = makeFakeDriver({ hasEmailInput: false })

    const loginId = await start(driver, 'user@example.com')

    await vi.waitFor(() =>
      expect(vi.mocked(driver.page.waitForSelector)).toHaveBeenCalledTimes(6)
    )
    expect(driver.emailInput.fill).not.toHaveBeenCalled()

    const { loginStatus } = await import('../login-service')
    expect(loginStatus(loginId).state).toBe('waiting')
  })
})
