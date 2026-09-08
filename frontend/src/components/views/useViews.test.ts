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

import { act, renderHook } from '@testing-library/react';
import { NewViewItem, useViews, VIEWS_STORAGE_KEY } from './useViews';

const newLogsItem: NewViewItem = {
  type: 'logs',
  cluster: 'cluster1',
  namespace: 'default',
  podName: 'my-pod',
  container: 'my-container',
};

const newMetricsItem: NewViewItem = {
  type: 'metrics',
  cluster: 'cluster1',
  nodeName: 'my-node',
};

describe('useViews', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with no views', () => {
    const { result } = renderHook(() => useViews());

    expect(result.current.views).toEqual([]);
  });

  it('creates a view and persists it to localStorage', () => {
    const { result } = renderHook(() => useViews());

    act(() => {
      result.current.createView('My view');
    });

    expect(result.current.views).toHaveLength(1);
    expect(result.current.views[0]).toMatchObject({ name: 'My view', items: [] });

    const stored = JSON.parse(localStorage.getItem(VIEWS_STORAGE_KEY)!);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ name: 'My view', items: [] });
  });

  it('deletes a view', () => {
    const { result } = renderHook(() => useViews());

    act(() => {
      result.current.createView('View 1');
      result.current.createView('View 2');
    });

    const viewIdToDelete = result.current.views[0].id;

    act(() => {
      result.current.deleteView(viewIdToDelete);
    });

    expect(result.current.views).toHaveLength(1);
    expect(result.current.views[0].name).toBe('View 2');
  });

  it('renames a view', () => {
    const { result } = renderHook(() => useViews());

    act(() => {
      result.current.createView('Old name');
    });

    const viewId = result.current.views[0].id;

    act(() => {
      result.current.renameView(viewId, 'New name');
    });

    expect(result.current.views[0].name).toBe('New name');
  });

  it('adds an item to an existing view with a cascading layout offset', () => {
    const { result } = renderHook(() => useViews());

    act(() => {
      result.current.createView('My view');
    });

    const viewId = result.current.views[0].id;

    act(() => {
      result.current.addItemToView(viewId, newLogsItem);
    });

    expect(result.current.views[0].items).toHaveLength(1);
    expect(result.current.views[0].items[0]).toMatchObject(newLogsItem);
    expect(result.current.views[0].items[0].layout).toEqual({ x: 0, y: 0, w: 500, h: 350 });

    act(() => {
      result.current.addItemToView(viewId, newMetricsItem);
    });

    expect(result.current.views[0].items).toHaveLength(2);
    expect(result.current.views[0].items[1]).toMatchObject(newMetricsItem);
    expect(result.current.views[0].items[1].layout).toMatchObject({ x: 40, y: 40 });
  });

  it('adds an item to a new view', () => {
    const { result } = renderHook(() => useViews());

    act(() => {
      result.current.addItemToNewView('New view', newLogsItem);
    });

    expect(result.current.views).toHaveLength(1);
    expect(result.current.views[0].name).toBe('New view');
    expect(result.current.views[0].items).toHaveLength(1);
    expect(result.current.views[0].items[0]).toMatchObject(newLogsItem);
  });

  it('removes an item from a view', () => {
    const { result } = renderHook(() => useViews());

    act(() => {
      result.current.createView('My view');
    });

    const viewId = result.current.views[0].id;

    act(() => {
      result.current.addItemToView(viewId, newLogsItem);
      result.current.addItemToView(viewId, newMetricsItem);
    });

    const itemIdToRemove = result.current.views[0].items[0].id;

    act(() => {
      result.current.removeItemFromView(viewId, itemIdToRemove);
    });

    expect(result.current.views[0].items).toHaveLength(1);
    expect(result.current.views[0].items[0]).toMatchObject(newMetricsItem);
  });

  it('updates and persists an item layout', () => {
    const { result } = renderHook(() => useViews());

    act(() => {
      result.current.createView('My view');
    });

    const viewId = result.current.views[0].id;

    act(() => {
      result.current.addItemToView(viewId, newLogsItem);
    });

    const itemId = result.current.views[0].items[0].id;
    const newLayout = { x: 10, y: 20, w: 300, h: 200 };

    act(() => {
      result.current.updateItemLayout(viewId, itemId, newLayout);
    });

    expect(result.current.views[0].items[0].layout).toEqual(newLayout);

    const stored = JSON.parse(localStorage.getItem(VIEWS_STORAGE_KEY)!);
    expect(stored[0].items[0].layout).toEqual(newLayout);
  });
});
