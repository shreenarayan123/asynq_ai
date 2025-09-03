type Message = {
  id: string
  sender: "user" | "bot"
  text: string
  timestamp: string
  from: string
}
type Rule = { id: string; keyword: string; response: string }

let connected = false
let qrUrl = "/whatsapp-qr-code.jpg"
const messages: Message[] = [
  {
    id: "m1",
    sender: "user",
    text: "Hello!",
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    from: "+12025550100",
  },
  {
    id: "m2",
    sender: "bot",
    text: "Hi there 👋 How can I help?",
    timestamp: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
    from: "Brew Bot",
  },
]
let rules: Rule[] = [
  { id: "r1", keyword: "hello", response: "Hi! How can I help?" },
  { id: "r2", keyword: "pricing", response: "Our pricing starts at $9/month." },
]
const settings = { openaiApiKeyMasked: "sk-••••••••••••••••", botEnabled: false }

export const db = {
  getConnection: () => ({
    status: connected ? ("connected" as const) : ("disconnected" as const),
    qr: connected ? undefined : qrUrl,
  }),
  reconnect: () => {
    connected = false
    qrUrl = "/new-whatsapp-qr-code.jpg"
    return true
  },
  connectNow: () => {
    connected = true
    return true
  },
  messages: {
    list: () => messages,
    add: (m: Message) => {
      messages.push(m)
      return m
    },
  },
  rules: {
    list: () => rules,
    add: (r: Omit<Rule, "id">) => {
      const rule = { id: crypto.randomUUID(), ...r }
      rules.push(rule)
      return rule
    },
    update: (id: string, r: Partial<Omit<Rule, "id">>) => {
      const idx = rules.findIndex((x) => x.id === id)
      if (idx === -1) return null
      rules[idx] = { ...rules[idx], ...r }
      return rules[idx]
    },
    delete: (id: string) => {
      const before = rules.length
      rules = rules.filter((x) => x.id !== id)
      return rules.length < before
    },
  },
  settings: {
    get: () => settings,
    set: (payload: { botEnabled?: boolean; openaiApiKey?: string }) => {
      if (typeof payload.botEnabled === "boolean") settings.botEnabled = payload.botEnabled
      if (payload.openaiApiKey) settings.openaiApiKeyMasked = "sk-••••••••••••••••"
      return settings
    },
  },
}
