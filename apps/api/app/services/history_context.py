"""Resolve a trusted project scope before existing mutation handlers run."""
from sqlalchemy import select
from app.models.asset import Asset
from app.models.collaboration import Comment, ShotVersion
from app.models.production import Production
from app.models.shot import Shot
from app.services.history_service import HistoryService, allowed


async def begin_request_history(db, request, user):
    if request.method not in {'POST', 'PUT', 'PATCH', 'DELETE'}: return
    path = request.url.path
    if any(part in path for part in ('/history', '/workspace-layout', '/import-preview', '/read-state', '/shares', '/exports', '/ai/', '/auth/')): return
    if '/versions' in path and not path.endswith(('/restore', '/merge')): return
    params = request.path_params
    project = params.get('production_id')
    label, permission = '修改项目内容', 'shot.write'
    if '/workspace-layout' in path: label = '调整表格布局'
    elif '/import-commit' in path: label = '导入镜头'
    elif '/custom-fields' in path or '/column-preferences' in path:
        label = '修改列'
        if '/copy-column' in path: label = '粘贴列'
        elif '/insert' in path: label = '新增列'
        elif '/values/' in path: label = '编辑单元格'
    elif '/saved-views' in path: label = '修改保存视图'
    elif '/export/templates' in path: label, permission = '修改交付模板', 'export.create'
    elif '/comments' in path:
        label, permission = '修改批注', 'review.comment'
        identity = params.get('comment_id')
        if identity: project = await db.scalar(select(Comment.production_id).where(Comment.id == identity))
    elif '/review-decisions' in path: label, permission = '修改审片意见', 'review.approve'
    elif '/assets' in path or '/panel-image' in path:
        label, permission = '修改素材', 'asset.write'
        if '/crop' in path: label = '调整图片构图'
    elif '/versions/' in path:
        label = '恢复镜头版本' if path.endswith('/restore') else '合并镜头版本'
        project = await db.scalar(select(Shot.production_id).join(ShotVersion, ShotVersion.shot_id == Shot.id)
            .where(ShotVersion.id == params.get('version_id')))
    elif '/shots' in path:
        label = {'POST': '新增镜头', 'PATCH': '编辑镜头', 'DELETE': '删除镜头'}[request.method] if request.method != 'PUT' else '编辑镜头'
        if '/reorder' in path: label = '镜头排序'
        elif '/bulk-update' in path: label = '批量修改镜头'
        elif '/bulk-trash' in path: label = '批量删除镜头'
        elif '/restore' in path: label = '恢复镜头'
        elif '/relative-command' in path: label = '插入或粘贴镜头'
        elif '/auto-timing' in path: label = '修改镜头时长'
    elif path.rstrip('/').split('/')[-2:-1] == ['productions']:
        project = params.get('id')
        label, permission = '修改项目设置', 'production.write'
    else: return
    if project is None:
        shot_id = params.get('shot_id') or (params.get('id') if '/shots/' in path else None)
        if shot_id: project = await db.scalar(select(Shot.production_id).where(Shot.id == shot_id))
    if project is None and request.headers.get('content-type', '').startswith('application/json'):
        body = await request.json()
        if isinstance(body, dict):
            project = body.get('production_id')
            if project is None and isinstance(body.get('shot_ids'), list) and body['shot_ids']:
                project = await db.scalar(select(Shot.production_id).where(Shot.id == body['shot_ids'][0]))
    if project is not None:
        if permission == 'asset.write' and not allowed(user, permission) and allowed(user, 'production.write'): permission = 'production.write'
        if permission == 'review.comment':
            identity = params.get('comment_id')
            author = await db.scalar(select(Comment.user_id).where(Comment.id == identity)) if identity else user.id
            permission = 'review.approve' if author != user.id and not path.endswith('/resolve') else next((p for p in ('production.read', 'production.write', 'shot.write', 'review.approve') if allowed(user, p)), 'review.comment')
        if '/review-decisions' in path and request.headers.get('content-type', '').startswith('application/json'):
            body = await request.json()
            if body.get('action') in {'submit', 'withdraw'}: permission = 'shot.write'
        await HistoryService.begin(db, project, user, label, permission, irreversible=path.endswith('/purge'))
