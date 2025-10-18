client<llm> CustomChat {
  provider openai
  options {
    model "DeepSeek V3.1"
    api_key env.OPENAI_API_KEY
    base_url env.OPENAI_BASE_URL
  }
}
