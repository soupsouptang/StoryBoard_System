'use client';

import React, { useState } from 'react';
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  Icons,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  TextArea
} from '@frameforge/ui';
import {
  type CustomFieldDefinition,
  type CustomFieldType,
  useCreateCustomField,
  useCustomFields,
  usePurgeCustomField,
  useSetCustomFieldState,
  useUpdateCustomField
} from '@/lib/hooks/useCustomFields';

const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  text: '单行文本',
  textarea: '多行文本',
  number: '数字',
  boolean: '勾选',
  date: '日期',
  url: '链接',
  select: '单选',
  multiselect: '多选',
  json: '结构化内容'
};

interface ShotCustomFieldManagerProps {
  productionId: string;
}

import { isRetiredShotColumnLabel } from '@/lib/shot-table-presentation';

export function ShotCustomFieldManager({ productionId }: ShotCustomFieldManagerProps) {
  const { data: allFields = [], isLoading } = useCustomFields(productionId);
  const fields = allFields.filter(field => !isRetiredShotColumnLabel(field.label));
  const createField = useCreateCustomField(productionId);
  const updateField = useUpdateCustomField(productionId);
  const setFieldState = useSetCustomFieldState(productionId);
  const purgeField = usePurgeCustomField(productionId);

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldType>('text');
  const [selectOptions, setSelectOptions] = useState('');
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editFieldType, setEditFieldType] = useState<CustomFieldType>('text');
  const [editDescription, setEditDescription] = useState('');
  const [editOptions, setEditOptions] = useState('');
  const [editRequired, setEditRequired] = useState(false);
  const [pendingPurge, setPendingPurge] = useState<CustomFieldDefinition | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const resetCreateForm = () => {
    setLabel('');
    setFieldType('text');
    setSelectOptions('');
    setActionError(null);
  };

  const parseOptions = (raw: string) =>
    Array.from(
      new Set(
        raw
          .split(/[，,\n]/)
          .map(item => item.trim())
          .filter(Boolean)
      )
    );

  const beginEdit = (field: CustomFieldDefinition) => {
    setPopoverOpen(false);
    setEditingField(field);
    setEditLabel(field.label);
    setEditFieldType(field.field_type);
    setEditDescription(field.description || '');
    setEditOptions(field.options.join(', '));
    setEditRequired(field.required);
    setActionError(null);
  };

  const resetEditForm = () => {
    setEditingField(null);
    setEditLabel('');
    setEditFieldType('text');
    setEditDescription('');
    setEditOptions('');
    setEditRequired(false);
    setActionError(null);
  };

  const saveEdit = async () => {
    if (!editingField) return;
    const nextLabel = editLabel.trim();
    if (!nextLabel) return;

    const options =
      ['select', 'multiselect'].includes(editFieldType)
        ? parseOptions(editOptions)
        : undefined;

    setActionError(null);
    try {
      await updateField.mutateAsync({
        id: editingField.id,
        revision: editingField.revision,
        label: nextLabel,
        fieldType: editFieldType,
        description: editDescription.trim(),
        options,
        required: editRequired
      });
      resetEditForm();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '修改自定义列失败');
    }
  };

  const create = async () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return;

    const options = ['select', 'multiselect'].includes(fieldType) ? parseOptions(selectOptions) : [];

    setActionError(null);
    try {
      await createField.mutateAsync({
        label: trimmedLabel,
        fieldType,
        options
      });
      resetCreateForm();
      setCreateOpen(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '创建自定义列失败');
    }
  };

  const changeState = async (
    field: CustomFieldDefinition,
    state: 'visible' | 'hidden' | 'removed'
  ) => {
    setActionError(null);
    try {
      await setFieldState.mutateAsync({
        id: field.id,
        revision: field.revision,
        state
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '修改列状态失败');
    }
  };

  const purge = async () => {
    if (!pendingPurge) return;
    setActionError(null);
    try {
      await purgeField.mutateAsync({
        id: pendingPurge.id,
        revision: pendingPurge.revision
      });
      setPendingPurge(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '永久删除自定义列失败');
    }
  };

  const activeCount = fields.filter(field => field.state !== 'removed').length;
  const archivedCount = fields.filter(field => field.state === 'removed').length;

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 text-xs">
            <Icons.Columns3 className="h-3.5 w-3.5" aria-hidden="true" />
            自定义列
            {fields.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 justify-center px-1.5 text-[10px]">
                {activeCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-[min(430px,calc(100vw-24px))] p-0">
          <div className="border-b border-border px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-foreground">自定义列</div>
                <div className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                  隐藏只影响显示；归档保留数据；永久删除只允许对已归档列执行。
                </div>
              </div>
              {archivedCount > 0 && (
                <Badge variant="outline">{archivedCount} 已归档</Badge>
              )}
            </div>
          </div>

          <div className="max-h-[min(56vh,420px)] overflow-y-auto p-1.5">
            {isLoading ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                正在加载自定义列...
              </div>
            ) : fields.length === 0 ? (
              <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                暂无自定义列。
              </div>
            ) : (
              fields.map(field => (
                <div
                  key={field.id}
                  className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {field.label}
                      </span>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {FIELD_TYPE_LABELS[field.field_type]}
                      </Badge>
                      {field.state === 'hidden' && (
                        <Badge variant="secondary" className="shrink-0 text-[10px]">已隐藏</Badge>
                      )}
                      {field.state === 'removed' && (
                        <Badge variant="secondary" className="shrink-0 text-[10px]">已归档</Badge>
                      )}
                    </div>
                    <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                      {field.column_key} · rev {field.revision}
                    </div>
                  </div>

                  {field.state !== 'removed' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      title="编辑列"
                      aria-label={`编辑自定义列 ${field.label}`}
                      disabled={updateField.isPending}
                      onClick={() => beginEdit(field)}
                    >
                      <Icons.Settings className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  )}

                  {field.state === 'visible' && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        title="隐藏列"
                        aria-label={`隐藏自定义列 ${field.label}`}
                        disabled={setFieldState.isPending}
                        onClick={() => void changeState(field, 'hidden')}
                      >
                        <Icons.EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        title="归档列"
                        aria-label={`归档自定义列 ${field.label}`}
                        disabled={setFieldState.isPending}
                        onClick={() => void changeState(field, 'removed')}
                      >
                        <Icons.Archive className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </>
                  )}

                  {field.state === 'hidden' && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        title="显示列"
                        aria-label={`显示自定义列 ${field.label}`}
                        disabled={setFieldState.isPending}
                        onClick={() => void changeState(field, 'visible')}
                      >
                        <Icons.Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        title="归档列"
                        aria-label={`归档自定义列 ${field.label}`}
                        disabled={setFieldState.isPending}
                        onClick={() => void changeState(field, 'removed')}
                      >
                        <Icons.Archive className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </>
                  )}

                  {field.state === 'removed' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 shrink-0 px-2 text-[11px]"
                        disabled={setFieldState.isPending}
                        onClick={() => void changeState(field, 'visible')}
                      >
                        恢复
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        title="永久删除"
                        aria-label={`永久删除自定义列 ${field.label}`}
                        disabled={purgeField.isPending}
                        onClick={() => {
                          setPopoverOpen(false);
                          setPendingPurge(field);
                          setActionError(null);
                        }}
                      >
                        <Icons.Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          {actionError && (
            <div
              role="alert"
              className="mx-3 mb-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive"
            >
              {actionError}
            </div>
          )}

          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-full justify-start text-xs"
              onClick={() => {
                setPopoverOpen(false);
                resetCreateForm();
                setCreateOpen(true);
              }}
            >
              <Icons.Plus className="h-3.5 w-3.5" aria-hidden="true" />
              新建自定义列
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog
        open={createOpen}
        onOpenChange={open => {
          if (!open && !createField.isPending) {
            setCreateOpen(false);
            resetCreateForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogTitle>新建自定义列</DialogTitle>
          <DialogDescription>
            创建后列键由服务器固定；列名可以后续调整。归档不会删除已有镜头值。
          </DialogDescription>

          <div className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="custom-field-label" className="text-sm font-medium text-foreground">
                列名称
              </label>
              <Input
                id="custom-field-label"
                value={label}
                onChange={event => setLabel(event.target.value)}
                placeholder="例如：场地备注"
                maxLength={80}
                autoFocus
              />
            </div>

            <Select
              label="字段类型"
              value={fieldType}
              onChange={value => setFieldType(value as CustomFieldType)}
              options={(Object.keys(FIELD_TYPE_LABELS) as CustomFieldType[]).map(value => ({
                value,
                label: FIELD_TYPE_LABELS[value]
              }))}
            />

            {['select', 'multiselect'].includes(fieldType) && (
              <div className="space-y-2">
                <label htmlFor="custom-field-options" className="text-sm font-medium text-foreground">
                  选项
                </label>
                <Input
                  id="custom-field-options"
                  value={selectOptions}
                  onChange={event => setSelectOptions(event.target.value)}
                  placeholder="例如：A景区, B景区, 待确认"
                />
                <p className="text-[11px] text-muted-foreground">
                  使用逗号分隔，至少一个选项。
                </p>
              </div>
            )}
          </div>

          {actionError && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
            >
              {actionError}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              disabled={createField.isPending}
              onClick={() => {
                setCreateOpen(false);
                resetCreateForm();
              }}
            >
              取消
            </Button>
            <Button
              disabled={
                !label.trim() ||
                createField.isPending ||
                (['select', 'multiselect'].includes(fieldType) && !selectOptions.trim())
              }
              onClick={() => void create()}
            >
              {createField.isPending ? '创建中…' : '创建列'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingField)}
        onOpenChange={open => {
          if (!open && !updateField.isPending) resetEditForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogTitle>编辑自定义列</DialogTitle>
          <DialogDescription>
            {editingField
              ? `列键 ${editingField.column_key} 保持固定。字段类型可以修改；若已有镜头值需要实际改变数据类型，系统会阻止修改，避免绕过镜头 revision 静默重写数据。`
              : ''}
          </DialogDescription>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="custom-field-edit-label" className="text-sm font-medium text-foreground">
                列名称
              </label>
              <Input
                id="custom-field-edit-label"
                value={editLabel}
                onChange={event => setEditLabel(event.target.value)}
                maxLength={80}
                autoFocus
              />
            </div>

            <Select
              label="字段类型"
              value={editFieldType}
              onChange={value => {
                const nextType = value as CustomFieldType;
                setEditFieldType(nextType);
                if (['select', 'multiselect'].includes(nextType) && editOptions.trim() === '' && ['select', 'multiselect'].includes(editingField?.field_type || '')) {
                  setEditOptions(editingField?.options.join(', ') || '');
                }
              }}
              options={(Object.keys(FIELD_TYPE_LABELS) as CustomFieldType[]).map(value => ({
                value,
                label: FIELD_TYPE_LABELS[value]
              }))}
            />

            {editingField && editFieldType !== editingField.field_type && (
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-[11px] leading-4 text-muted-foreground">
                类型将从 {FIELD_TYPE_LABELS[editingField.field_type]} 改为 {FIELD_TYPE_LABELS[editFieldType]}。
                已有值必须能被目标类型直接接受；需要转换的数据会保留原状并阻止保存。
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="custom-field-edit-description" className="text-sm font-medium text-foreground">
                说明
              </label>
              <TextArea
                id="custom-field-edit-description"
                value={editDescription}
                onChange={event => setEditDescription(event.target.value)}
                placeholder="可选，用于说明这一列的填写口径"
                maxLength={1000}
                rows={3}
              />
            </div>

            {['select', 'multiselect'].includes(editFieldType) && (
              <div className="space-y-2">
                <label htmlFor="custom-field-edit-options" className="text-sm font-medium text-foreground">
                  选项
                </label>
                <Input
                  id="custom-field-edit-options"
                  value={editOptions}
                  onChange={event => setEditOptions(event.target.value)}
                  placeholder="例如：待定, 已确认, 驳回"
                />
                <p className="text-[11px] leading-4 text-muted-foreground">
                  使用逗号分隔；正在被镜头使用的选项不能直接删除。
                </p>
              </div>
            )}

            <label className="flex items-start gap-3 rounded-md border border-border px-3 py-2.5">
              <Checkbox
                checked={editRequired}
                onCheckedChange={checked => setEditRequired(checked === true)}
                aria-label="必填字段"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">必填字段</span>
                <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                  开启后，后续写入不允许保存空值；已有镜头值不会被自动补齐。
                </span>
              </span>
            </label>
          </div>

          {actionError && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
            >
              {actionError}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              disabled={updateField.isPending}
              onClick={resetEditForm}
            >
              取消
            </Button>
            <Button
              disabled={
                !editLabel.trim() ||
                updateField.isPending ||
                (['select', 'multiselect'].includes(editFieldType) && parseOptions(editOptions).length === 0)
              }
              onClick={() => void saveEdit()}
            >
              {updateField.isPending ? '保存中…' : '保存修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(pendingPurge)}
        onOpenChange={open => {
          if (!open && !purgeField.isPending) {
            setPendingPurge(null);
            setActionError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogTitle>永久删除自定义列</DialogTitle>
          <DialogDescription>
            {pendingPurge
              ? `“${pendingPurge.label}”的所有镜头值将被删除，列键 ${pendingPurge.column_key} 会保留为不可逆 tombstone，旧保存视图也不能再次恢复它。`
              : ''}
          </DialogDescription>

          {actionError && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
            >
              {actionError}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              disabled={purgeField.isPending}
              onClick={() => {
                setPendingPurge(null);
                setActionError(null);
              }}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={purgeField.isPending}
              onClick={() => void purge()}
            >
              {purgeField.isPending ? '永久删除中…' : '永久删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
