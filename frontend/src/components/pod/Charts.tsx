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

import '../../i18n/config';
import { useTranslation } from 'react-i18next';
import Pod from '../../lib/k8s/pod';
import { PodMetrics } from '../../lib/k8s/PodMetrics';
import { parseCpu, parseRam, TO_GB, TO_ONE_CPU } from '../../lib/units';
import TileChart from '../common/TileChart';

/**
 * Sums a resource (cpu or memory) request or limit across all containers of a pod.
 * Pods (unlike Nodes) have no "capacity"; the closest equivalent is the amount of
 * the resource its containers ask for, so the limit is preferred (falling back to
 * the request when no limit is set).
 */
function getPodResourceAllocation(
  pod: Pod,
  resource: 'cpu' | 'memory',
  parser: (value: string) => number
) {
  const sum = (field: 'limits' | 'requests') =>
    (pod.spec.containers || [])
      .map(container => parser(container.resources?.[field]?.[resource] || '0'))
      .reduce((a, b) => a + b, 0);

  const limit = sum('limits');
  return limit > 0 ? limit : sum('requests');
}

/** Sums a resource's usage across all containers reported in a pod's metrics. */
function getPodResourceUsage(metrics: PodMetrics | null, resource: 'cpu' | 'memory') {
  if (!metrics) {
    return -1;
  }
  const parser = resource === 'cpu' ? parseCpu : parseRam;
  return (metrics.jsonData.containers || [])
    .map(container => parser(container.usage?.[resource] || '0'))
    .reduce((a, b) => a + b, 0);
}

export interface PodResourceCircularChartProps {
  pod: Pod | null;
  /** The pod's metrics, or null if not yet loaded/available. */
  metrics: PodMetrics | null;
  /** Whether no metrics are available. If true, a message is displayed instead of a chart. */
  noMetrics?: boolean;
}

export function PodCpuCircularChart(props: PodResourceCircularChartProps) {
  const { pod, metrics, noMetrics = false } = props;
  const { t } = useTranslation(['translation', 'glossary']);

  const available = pod ? getPodResourceAllocation(pod, 'cpu', parseCpu) / TO_ONE_CPU : -1;
  const used = getPodResourceUsage(metrics, 'cpu') / TO_ONE_CPU;
  const hasData = !noMetrics && !!pod && used >= 0 && available > 0;

  function getLabel() {
    if (!hasData) {
      return '…';
    }
    return `${((used / available) * 100).toFixed(1)} %`;
  }

  function getLegend() {
    if (!pod || available <= 0) {
      return '';
    }
    const availableLabel = t('translation|{{ available }} units', { available });
    if (noMetrics || used < 0) {
      return availableLabel;
    }
    return `${used.toFixed(2)} / ${availableLabel}`;
  }

  return (
    <TileChart
      title={noMetrics ? t('glossary|CPU') : t('translation|CPU Usage')}
      data={hasData ? [{ name: 'used', value: used }] : []}
      total={available > 0 ? available : -1}
      label={getLabel()}
      legend={getLegend()}
      infoTooltip={
        noMetrics ? t('translation|Install the metrics-server to get usage data.') : null
      }
    />
  );
}

export function PodMemoryCircularChart(props: PodResourceCircularChartProps) {
  const { pod, metrics, noMetrics = false } = props;
  const { t } = useTranslation(['translation', 'glossary']);

  const available = pod ? getPodResourceAllocation(pod, 'memory', parseRam) / TO_GB : -1;
  const used = getPodResourceUsage(metrics, 'memory') / TO_GB;
  const hasData = !noMetrics && !!pod && used >= 0 && available > 0;

  function getLabel() {
    if (!hasData) {
      return '…';
    }
    return `${((used / available) * 100).toFixed(1)} %`;
  }

  function getLegend() {
    if (!pod || available <= 0) {
      return '';
    }
    const availableLabel = `${available.toFixed(2)} GB`;
    if (noMetrics || used < 0) {
      return availableLabel;
    }
    return `${used.toFixed(2)} / ${availableLabel}`;
  }

  return (
    <TileChart
      title={noMetrics ? t('glossary|Memory') : t('translation|Memory Usage')}
      data={hasData ? [{ name: 'used', value: used }] : []}
      total={available > 0 ? available : -1}
      label={getLabel()}
      legend={getLegend()}
      infoTooltip={
        noMetrics ? t('translation|Install the metrics-server to get usage data.') : null
      }
    />
  );
}
