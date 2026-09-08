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

import Button from '@mui/material/Button';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { createRouteURL } from '../../lib/router';
import ActionButton from '../common/ActionButton';
import { Dialog } from '../common/Dialog';
import EmptyContent from '../common/EmptyContent';
import Link from '../common/Link';
import SectionBox from '../common/SectionBox';
import SectionHeader from '../common/SectionHeader';
import SimpleTable from '../common/SimpleTable';
import { useViews, View } from './useViews';

/**
 * Page listing all the user defined views.
 */
export default function ViewList() {
  const { views, createView, deleteView } = useViews();
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [newViewName, setNewViewName] = React.useState('');
  const history = useHistory();
  const { t } = useTranslation(['translation', 'glossary']);

  function handleCreate() {
    const name = newViewName.trim();
    if (!name) {
      return;
    }
    const view = createView(name);
    setCreateDialogOpen(false);
    setNewViewName('');
    history.push(createRouteURL('view', { id: view.id }));
  }

  return (
    <SectionBox
      backLink
      title={
        <SectionHeader
          title={t('glossary|Views')}
          actions={[
            <Button
              key="new-view"
              variant="contained"
              color="primary"
              onClick={() => setCreateDialogOpen(true)}
            >
              {t('translation|New view')}
            </Button>,
          ]}
        />
      }
    >
      {views.length === 0 ? (
        <EmptyContent>
          {t(
            'translation|No views yet. Create one, or add metrics or logs windows to a view from resources.'
          )}
        </EmptyContent>
      ) : (
        <SimpleTable
          columns={[
            {
              label: t('translation|Name'),
              getter: (view: View) => (
                <Link routeName="view" params={{ id: view.id }}>
                  {view.name}
                </Link>
              ),
            },
            {
              label: t('translation|Windows'),
              getter: (view: View) => view.items.length,
            },
            {
              label: '',
              getter: (view: View) => (
                <ActionButton
                  icon="mdi:delete"
                  description={t('translation|Delete')}
                  onClick={() => deleteView(view.id)}
                />
              ),
            },
          ]}
          data={views}
        />
      )}
      <Dialog
        open={createDialogOpen}
        maxWidth="xs"
        fullWidth
        title={t('translation|New view')}
        onClose={() => setCreateDialogOpen(false)}
      >
        <DialogContent>
          <TextField
            fullWidth
            label={t('translation|Name')}
            value={newViewName}
            onChange={event => setNewViewName(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                handleCreate();
              }
            }}
            variant="standard"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>{t('translation|Cancel')}</Button>
          <Button disabled={!newViewName.trim()} onClick={handleCreate}>
            {t('translation|Create')}
          </Button>
        </DialogActions>
      </Dialog>
    </SectionBox>
  );
}
