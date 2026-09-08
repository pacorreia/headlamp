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

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import Node from '../../lib/k8s/node';
import Pod from '../../lib/k8s/pod';
import { CpuCircularChart, MemoryCircularChart } from '../cluster/Charts';
import { ClusterGroupErrorMessage } from '../cluster/ClusterGroupErrorMessage';
import ActionButton from '../common/ActionButton';
import EmptyContent from '../common/EmptyContent';
import Loader from '../common/Loader';
import { LogViewer } from '../common/LogViewer';
import SectionBox from '../common/SectionBox';
import { LogsViewItem, MetricsViewItem, useViews, ViewItem, ViewItemLayout } from './useViews';

const MIN_WINDOW_WIDTH = 250;
const MIN_WINDOW_HEIGHT = 180;

/**
 * Page showing a single view: a canvas where the metrics and logs windows can be
 * freely arranged by dragging and resizing them.
 */
export default function ViewDetails() {
  const { id } = useParams<{ id: string }>();
  const { views, removeItemFromView, updateItemLayout } = useViews();
  const { t } = useTranslation(['translation', 'glossary']);

  const view = views.find(view => view.id === id);

  if (!view) {
    return (
      <SectionBox backLink title={t('glossary|Views')}>
        <EmptyContent>{t('translation|View not found.')}</EmptyContent>
      </SectionBox>
    );
  }

  return (
    <SectionBox backLink title={view.name} sx={{ height: '100%' }}>
      {view.items.length === 0 ? (
        <EmptyContent>
          {t(
            'translation|This view is empty. Add metrics or logs windows to it from resources, e.g. from a node or from pod logs.'
          )}
        </EmptyContent>
      ) : (
        <Box
          sx={{
            position: 'relative',
            overflow: 'auto',
            width: '100%',
            height: '80vh',
          }}
        >
          {view.items.map(item => (
            <ViewWindow
              key={item.id}
              item={item}
              onRemove={() => removeItemFromView(view.id, item.id)}
              onLayoutChange={layout => updateItemLayout(view.id, item.id, layout)}
            />
          ))}
        </Box>
      )}
    </SectionBox>
  );
}

interface ViewWindowProps {
  item: ViewItem;
  onRemove: () => void;
  onLayoutChange: (layout: ViewItemLayout) => void;
}

interface DragState {
  mode: 'move' | 'resize';
  startX: number;
  startY: number;
  startLayout: ViewItemLayout;
}

/**
 * A draggable and resizable window inside a view canvas. It can be moved with its
 * title bar and resized with the handle in its bottom-right corner.
 */
function ViewWindow(props: ViewWindowProps) {
  const { item, onRemove, onLayoutChange } = props;
  const [layout, setLayout] = React.useState(item.layout);
  const layoutRef = React.useRef(layout);
  const dragStateRef = React.useRef<DragState | null>(null);
  const { t } = useTranslation();

  React.useEffect(() => {
    setLayout(item.layout);
    layoutRef.current = item.layout;
  }, [item.layout]);

  function applyDrag(event: React.PointerEvent) {
    const dragState = dragStateRef.current;
    if (!dragState) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    const { startLayout } = dragState;

    const newLayout =
      dragState.mode === 'move'
        ? {
            ...startLayout,
            x: Math.max(0, startLayout.x + deltaX),
            y: Math.max(0, startLayout.y + deltaY),
          }
        : {
            ...startLayout,
            w: Math.max(MIN_WINDOW_WIDTH, startLayout.w + deltaX),
            h: Math.max(MIN_WINDOW_HEIGHT, startLayout.h + deltaY),
          };

    layoutRef.current = newLayout;
    setLayout(newLayout);
  }

  function endDrag(event: React.PointerEvent) {
    const dragState = dragStateRef.current;
    if (!dragState) {
      return;
    }
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    dragStateRef.current = null;
    onLayoutChange(layoutRef.current);
    if (dragState.mode === 'resize') {
      // Let embedded terminals refit to the new size.
      window.dispatchEvent(new Event('resize'));
    }
  }

  function makeDragHandlers(mode: DragState['mode']) {
    return {
      onPointerDown: (event: React.PointerEvent) => {
        event.preventDefault();
        (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        dragStateRef.current = {
          mode,
          startX: event.clientX,
          startY: event.clientY,
          startLayout: layoutRef.current,
        };
      },
      onPointerMove: applyDrag,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onLostPointerCapture: endDrag,
    };
  }

  const title = item.type === 'logs' ? `${item.podName} (${item.container})` : `${item.nodeName}`;
  const subtitle =
    item.type === 'logs'
      ? `${item.cluster} / ${item.namespace}`
      : `${item.cluster} / ${t('glossary|Nodes')}`;

  return (
    <Paper
      variant="outlined"
      sx={{
        position: 'absolute',
        left: layout.x,
        top: layout.y,
        width: layout.w,
        height: layout.h,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box
        {...makeDragHandlers('move')}
        sx={theme => ({
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          padding: theme.spacing(0.5, 1),
          cursor: 'move',
          touchAction: 'none',
          userSelect: 'none',
          background: theme.palette.background.muted,
          borderBottom: `1px solid ${theme.palette.divider}`,
        })}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {subtitle}
          </Typography>
        </Box>
        <ActionButton
          icon="mdi:close"
          description={t('translation|Remove from view')}
          onClick={onRemove}
          iconButtonProps={{ onPointerDown: event => event.stopPropagation() }}
        />
      </Box>
      <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto' }}>
        {item.type === 'logs' ? <LogsWindow item={item} /> : <MetricsWindow item={item} />}
      </Box>
      <Box
        {...makeDragHandlers('resize')}
        sx={theme => ({
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 18,
          height: 18,
          cursor: 'nwse-resize',
          touchAction: 'none',
          zIndex: 1,
          borderRight: `3px solid ${theme.palette.divider}`,
          borderBottom: `3px solid ${theme.palette.divider}`,
        })}
      />
    </Paper>
  );
}

/**
 * Contents of a logs window: streams the logs of the pod container.
 */
function LogsWindow(props: { item: LogsViewItem }) {
  const { item } = props;
  const [pod, error] = Pod.useGet(item.podName, item.namespace, { cluster: item.cluster });
  const [logs, setLogs] = React.useState<string[]>([]);
  const { t } = useTranslation();

  const tailLines = 100;

  React.useEffect(() => {
    if (!pod) {
      return;
    }

    setLogs([]);
    const cancel = pod.getLogs(
      item.container,
      ({ logs: newLogs }: { logs: string[] }) => {
        // Keep the rendered log lines bounded, since newLogs grows indefinitely
        // while following.
        setLogs(newLogs.slice(-tailLines));
      },
      {
        tailLines,
        follow: true,
      }
    );

    return cancel;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pod?.metadata?.uid, item.container]);

  if (error) {
    return <ClusterGroupErrorMessage errors={[error]} />;
  }

  if (!pod) {
    return <Loader title={t('translation|Loading logs…')} />;
  }

  return (
    <Box
      sx={{
        height: '100%',
        '& .MuiDialogContent-root': {
          height: '100%',
          minHeight: '100%',
          padding: 1,
        },
      }}
    >
      <LogViewer
        noDialog
        open
        logs={logs}
        downloadName={`${item.podName}_${item.container}`}
        onClose={() => {}}
      />
    </Box>
  );
}

/**
 * Contents of a metrics window: shows the CPU and memory usage charts of the node.
 */
function MetricsWindow(props: { item: MetricsViewItem }) {
  const { item } = props;
  const [node, error] = Node.useGet(item.nodeName, undefined, { cluster: item.cluster });
  const [nodeMetrics, metricsError] = Node.useMetrics(item.cluster);
  const { t } = useTranslation();

  if (error) {
    return <ClusterGroupErrorMessage errors={[error]} />;
  }

  if (!node) {
    return <Loader title={t('translation|Loading metrics…')} />;
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        padding: 2,
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
      }}
    >
      <CpuCircularChart items={[node]} itemsMetrics={nodeMetrics} noMetrics={!!metricsError} />
      <MemoryCircularChart items={[node]} itemsMetrics={nodeMetrics} noMetrics={!!metricsError} />
    </Box>
  );
}
