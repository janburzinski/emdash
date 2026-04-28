export interface TabOrderState {
  tabOrder: string[];
  activeTabId: string | undefined;
}

export function addTabId(state: TabOrderState, id: string): void {
  if (!state.tabOrder.includes(id)) {
    state.tabOrder.push(id);
  }
}

export function setTabActive(state: TabOrderState, id: string): void {
  state.activeTabId = id;
}

export function reorderTabIds(state: TabOrderState, fromIndex: number, toIndex: number): void {
  if (fromIndex === toIndex) return;
  const [tab] = state.tabOrder.splice(fromIndex, 1);
  state.tabOrder.splice(toIndex, 0, tab);
}

export function setNextTabActive(state: TabOrderState): void {
  if (!state.activeTabId) return;
  const next = state.tabOrder[state.tabOrder.indexOf(state.activeTabId) + 1];
  if (next) state.activeTabId = next;
}

export function setPreviousTabActive(state: TabOrderState): void {
  if (!state.activeTabId) return;
  const prev = state.tabOrder[state.tabOrder.indexOf(state.activeTabId) - 1];
  if (prev) state.activeTabId = prev;
}

export function setTabActiveIndex(state: TabOrderState, index: number): void {
  if (index < 0 || state.tabOrder.length === 0) return;
  if (index >= state.tabOrder.length) {
    state.activeTabId = state.tabOrder[state.tabOrder.length - 1];
  } else {
    state.activeTabId = state.tabOrder[index];
  }
}
