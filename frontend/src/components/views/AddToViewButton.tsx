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
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useSnackbar } from 'notistack';
import React from 'react';
import { useTranslation } from 'react-i18next';
import ActionButton from '../common/ActionButton';
import { Dialog } from '../common/Dialog';
import { NewViewItem, useViews } from './useViews';

export interface AddToViewButtonProps {
  /** The window to add to a view when the user picks one. */
  item: NewViewItem;
}

/**
 * Button offering to add a metrics/logs window to an existing view or to a new one.
 */
export default function AddToViewButton(props: AddToViewButtonProps) {
  const { item } = props;
  const { views, addItemToView, addItemToNewView } = useViews();
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [newViewDialogOpen, setNewViewDialogOpen] = React.useState(false);
  const [newViewName, setNewViewName] = React.useState('');
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation(['translation', 'glossary']);

  function notifyAdded(viewName: string) {
    enqueueSnackbar(t('translation|Added to view {{ viewName }}', { viewName }), {
      variant: 'success',
    });
  }

  function handleAddToView(viewId: string, viewName: string) {
    addItemToView(viewId, item);
    setAnchorEl(null);
    notifyAdded(viewName);
  }

  function handleAddToNewView() {
    const name = newViewName.trim();
    if (!name) {
      return;
    }
    addItemToNewView(name, item);
    setNewViewDialogOpen(false);
    setNewViewName('');
    notifyAdded(name);
  }

  return (
    <>
      <ActionButton
        icon="mdi:view-grid-plus-outline"
        description={t('translation|Add to view')}
        onClick={event => setAnchorEl(event.currentTarget)}
      />
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
        {views.map(view => (
          <MenuItem key={view.id} onClick={() => handleAddToView(view.id, view.name)}>
            {view.name}
          </MenuItem>
        ))}
        {views.length > 0 && <Divider />}
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            setNewViewDialogOpen(true);
          }}
        >
          {t('translation|Add to new view…')}
        </MenuItem>
      </Menu>
      <Dialog
        open={newViewDialogOpen}
        maxWidth="xs"
        fullWidth
        title={t('translation|New view')}
        onClose={() => setNewViewDialogOpen(false)}
      >
        <DialogContent>
          <TextField
            fullWidth
            label={t('translation|Name')}
            value={newViewName}
            onChange={event => setNewViewName(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                handleAddToNewView();
              }
            }}
            variant="standard"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewViewDialogOpen(false)}>{t('translation|Cancel')}</Button>
          <Button disabled={!newViewName.trim()} onClick={handleAddToNewView}>
            {t('translation|Add')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
