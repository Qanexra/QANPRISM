/**
 * Browser Action Parser & ReAct Autonomous Prompt Engine
 */

export const BROWSER_AGENT_SYSTEM_PROMPT = `You are QanPrism Autonomous Web Agent with full visual perception and 100% control over the browser.

You can observe the webpage, see all interactive elements (buttons, inputs, links indexed with [#ID]), and execute actions to achieve the user's objective.

### Available Actions:
1. \`ACTION: NAVIGATE "https://..."\` - Go to a website or search engine
2. \`ACTION: CLICK [#ID]\` - Click button, link, or tab with specified ID
3. \`ACTION: TYPE [#ID] "text" [ENTER]\` - Type text into input field [#ID] (optionally press Enter)
4. \`ACTION: SCROLL DOWN\` or \`ACTION: SCROLL UP\` - Scroll the active viewport
5. \`ACTION: NEW_TAB "https://..."\` - Open a new browser tab
6. \`ACTION: DONE "Your final comprehensive answer or summary"\` - When the task is complete

### Rules of Operation:
- Think step-by-step.
- In each step, provide a concise Thought explaining what you observe and what you plan to do, followed by exactly ONE Action.
- Example response:
Thought: I see the Google search input at [#1]. I will type 'Open source AI models' and press enter.
ACTION: TYPE [#1] "Open source AI models" ENTER
`;

/**
 * Parses the agent's LLM response for thoughts and structured actions
 */
export function parseAgentAction(responseContent) {
  if (!responseContent || typeof responseContent !== 'string') {
    return { type: 'DONE', message: 'No response content' };
  }

  const text = responseContent.trim();
  
  // Extract Thought
  let thought = '';
  const thoughtMatch = text.match(/Thought:\s*([\s\S]*?)(?=ACTION:|$)/i);
  if (thoughtMatch) {
    thought = thoughtMatch[1].trim();
  }

  // Extract Action
  const actionMatch = text.match(/ACTION:\s*([A-Z_]+)([\s\S]*)/i);
  if (!actionMatch) {
    // If no explicit ACTION prefix, check if it's already a direct answer
    return {
      type: 'DONE',
      thought: thought || 'Task completed.',
      message: text
    };
  }

  const actionType = actionMatch[1].toUpperCase();
  const argsString = actionMatch[2].trim();

  switch (actionType) {
    case 'NAVIGATE': {
      const urlMatch = argsString.match(/["']?([^"'\s]+)["']?/);
      return {
        type: 'NAVIGATE',
        thought,
        url: urlMatch ? urlMatch[1] : argsString
      };
    }

    case 'CLICK': {
      const idMatch = argsString.match(/\[?#?(\d+)\]?/);
      return {
        type: 'CLICK',
        thought,
        elementId: idMatch ? parseInt(idMatch[1], 10) : null
      };
    }

    case 'TYPE': {
      const idMatch = argsString.match(/\[?#?(\d+)\]?/);
      const textMatch = argsString.match(/["']([^"']+)["']/);
      const pressEnter = /ENTER/i.test(argsString);
      return {
        type: 'TYPE',
        thought,
        elementId: idMatch ? parseInt(idMatch[1], 10) : null,
        text: textMatch ? textMatch[1] : '',
        pressEnter
      };
    }

    case 'SCROLL':
    case 'SCROLL_DOWN':
    case 'SCROLL_UP': {
      const isUp = /UP/i.test(argsString) || actionType === 'SCROLL_UP';
      return {
        type: 'SCROLL',
        thought,
        direction: isUp ? 'UP' : 'DOWN',
        pixels: 600
      };
    }

    case 'NEW_TAB': {
      const urlMatch = argsString.match(/["']?([^"'\s]+)["']?/);
      return {
        type: 'NEW_TAB',
        thought,
        url: urlMatch ? urlMatch[1] : 'https://www.google.com'
      };
    }

    case 'DONE': {
      const msgMatch = argsString.match(/["']([\s\S]*?)["']$/) || [null, argsString];
      return {
        type: 'DONE',
        thought,
        message: msgMatch[1] || argsString || 'Task completed.'
      };
    }

    default:
      return {
        type: 'DONE',
        thought,
        message: text
      };
  }
}
