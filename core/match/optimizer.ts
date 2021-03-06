// This file is to optimize a state machine generated by compiler.
import { FixedState, State, StateKind, StatesObj } from "./compiler.ts";

export interface OptimizerData {
  onlyFixed: boolean;
  minLength: number;
  maxLength: number;
  fixed: string[];
  endsWith: string[];
  states?: State[];
}

type FixedStateArray = FixedState[];

export function optimize(states: State[]): OptimizerData {
  const paths = getAllPaths(states);
  const fixed: string[] = [];
  const endsWith: string[] = [];
  const dynamicPaths: Array<State[]> = [];
  let minLength = Infinity;
  let maxLength = -Infinity;

  for (const path of paths) {
    if (isFixed(path)) {
      const data: string[] = [];
      for (const state of path) {
        data.push(state.data);
      }
      const str = data.join("");
      if (!fixed.includes(str)) {
        fixed.push(str);
        if (str.length < minLength) {
          minLength = str.length;
        }
        if (str.length > maxLength) {
          maxLength = str.length;
        }
      }
    } else {
      let len = 0;
      for (const state of path) {
        if (state.kind === StateKind.FIXED) {
          len += state.data.length;
        } else {
          // Remmber: Start and End states are not in path.
          // So state is a PARAMETERIC state.
          // And it must match at least 1 byte.
          len += 1;
        }
      }
      if (len < minLength) {
        minLength = len;
      }
      maxLength = Infinity;
      dynamicPaths.push(path);
      const fixedEnd = getFixedEnd(path);
      if (fixedEnd && !endsWith.includes(fixedEnd)) {
        endsWith.push(fixedEnd);
      }
    }
  }

  if (fixed.length === paths.length) {
    return {
      onlyFixed: true,
      minLength,
      maxLength,
      fixed,
      endsWith
    };
  }

  return {
    onlyFixed: false,
    minLength,
    maxLength,
    fixed,
    endsWith,
    states: remap(dynamicPaths)
  };
}

function remap(paths: Array<State[]>): State[] {
  const states: StatesObj = {};
  return paths as any;
}

function getFixedEnd(path: State[]): string {
  const data: string[] = [];
  for (let i = path.length - 1; i >= 0; --i) {
    const state = path[i];
    if (state.kind === StateKind.FIXED) {
      data.push(state.data);
    } else {
      break;
    }
  }
  return data.reverse().join("");
}

function isFixed(path: State[]): path is FixedStateArray {
  for (const state of path) {
    if (state.kind === StateKind.PARAMETERIC) {
      return false;
    }
  }
  return true;
}

function getAllPaths(states: State[]): Array<State[]> {
  const ret: Array<State[]> = [];

  const statesStack: State[] = [states[0]];
  const pathStack: number[] = [-1];

  while (statesStack.length) {
    const selectedPath = pathStack.pop();
    const currentState = statesStack.pop();
    if (currentState.kind === StateKind.END) {
      ret.push([...statesStack.slice(1)]);
    }
    const nextStateId = currentState.nextStates[selectedPath + 1];
    const nextState = states[nextStateId];
    if (!nextStateId) {
      continue;
    }
    statesStack.push(currentState);
    pathStack.push(selectedPath + 1);
    statesStack.push(nextState);
    pathStack.push(-1);
  }

  return ret;
}
