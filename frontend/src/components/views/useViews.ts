/*
 * Copyright 2025 The Kubernetes Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useCallback } from 'react';
import { useLocalStorageState } from '../globalSearch/useLocalStorageState';

/** Position and size of a window inside a view canvas, in pixels. */
export interface ViewItemLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A window streaming the logs of a pod container. */
export interface LogsViewItem {
  id: string;
  type: 'logs';
  cluster: string;
  namespace: string;
  podName: string;
  container: string;
  layout: ViewItemLayout;
}

/** A window showing the CPU/memory metrics of a node. */
export interface MetricsViewItem {
  id: string;
  type: 'metrics';
  cluster: string;
  nodeName: string;
  layout: ViewItemLayout;
}

export type ViewItem = LogsViewItem | MetricsViewItem;

/** Input for adding a new window to a view: the layout and id are assigned automatically. */
export type NewViewItem =
  | Omit<LogsViewItem, 'id' | 'layout'>
  | Omit<MetricsViewItem, 'id' | 'layout'>;

/** A user defined canvas holding metrics and logs windows. */
export interface View {
  id: string;
  name: string;
  items: ViewItem[];
}

export const VIEWS_STORAGE_KEY = 'headlamp.views';

const DEFAULT_WINDOW_SIZE = { w: 500, h: 350 };
const NEW_WINDOW_OFFSET = 40;

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function makeItem(view: View, newItem: NewViewItem): ViewItem {
  // Cascade new windows so they don't fully overlap each other.
  const offset = (view.items.length * NEW_WINDOW_OFFSET) % 200;
  return {
    ...newItem,
    id: randomId(),
    layout: { x: offset, y: offset, ...DEFAULT_WINDOW_SIZE },
  };
}

/**
 * Hook managing the list of user defined views, persisted in localStorage and
 * kept in sync across all components using it.
 */
export function useViews() {
  const [views, setViews] = useLocalStorageState<View[]>(VIEWS_STORAGE_KEY, []);

  const createView = useCallback(
    (name: string) => {
      const view: View = { id: randomId(), name, items: [] };
      setViews(oldViews => [...oldViews, view]);
      return view;
    },
    [setViews]
  );

  const deleteView = useCallback(
    (viewId: string) => {
      setViews(oldViews => oldViews.filter(view => view.id !== viewId));
    },
    [setViews]
  );

  const renameView = useCallback(
    (viewId: string, name: string) => {
      setViews(oldViews => oldViews.map(view => (view.id === viewId ? { ...view, name } : view)));
    },
    [setViews]
  );

  const addItemToView = useCallback(
    (viewId: string, newItem: NewViewItem) => {
      setViews(oldViews =>
        oldViews.map(view =>
          view.id === viewId ? { ...view, items: [...view.items, makeItem(view, newItem)] } : view
        )
      );
    },
    [setViews]
  );

  const addItemToNewView = useCallback(
    (name: string, newItem: NewViewItem) => {
      const view: View = { id: randomId(), name, items: [] };
      view.items = [makeItem(view, newItem)];
      setViews(oldViews => [...oldViews, view]);
      return view;
    },
    [setViews]
  );

  const removeItemFromView = useCallback(
    (viewId: string, itemId: string) => {
      setViews(oldViews =>
        oldViews.map(view =>
          view.id === viewId
            ? { ...view, items: view.items.filter(item => item.id !== itemId) }
            : view
        )
      );
    },
    [setViews]
  );

  const updateItemLayout = useCallback(
    (viewId: string, itemId: string, layout: ViewItemLayout) => {
      setViews(oldViews =>
        oldViews.map(view =>
          view.id === viewId
            ? {
                ...view,
                items: view.items.map(item => (item.id === itemId ? { ...item, layout } : item)),
              }
            : view
        )
      );
    },
    [setViews]
  );

  return {
    views,
    createView,
    deleteView,
    renameView,
    addItemToView,
    addItemToNewView,
    removeItemFromView,
    updateItemLayout,
  };
}
