import ExcelJS from 'exceljs';
import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  requireBoardBodyAccess,
  requireBoardParamAccess,
  requireBoardQueryAccess,
  requireCardLabelAccess,
  requireCardMoveAccess,
  requireCardParamAccess,
  requireChecklistParamAccess,
  requireCommentParamAccess,
  requireLabelParamAccess,
  requireListBodyAccess,
  requireListParamAccess,
} from '../access/board-access';
import { requireAuth } from '../auth/auth.routes';
import { broadcastBoardChange } from '../realtime/realtime';
import {
  addCard,
  addChecklistItem,
  addComment,
  addList,
  BoardError,
  createBoard,
  createLabel,
  editCard,
  editChecklistItem,
  editLabel,
  getBoard,
  listBoards,
  listMembers,
  moveBoard,
  moveCard,
  moveChecklistItem,
  moveList,
  removeBoard,
  removeCard,
  removeChecklistItem,
  removeComment,
  removeLabel,
  removeList,
  duplicateCard,
  renameBoard,
  setBoardColor,
  setBoardFolder,
  renameList,
  setListColor,
  listArchivedCards,
  setCardArchived,
  setCardAssignee,
  setCardDone,
  toggleCardLabel,
} from './board.service';

const LABEL_COLORS = ['purple', 'blue', 'red', 'green', 'amber', 'teal', 'gray'];
const datePattern = '^\\d{4}-\\d{2}-\\d{2}$';
const timePattern = '^([01]\\d|2[0-3]):[0-5]\\d$';
// Валидируем uuid паттерном (ajv-formats в Fastify по умолчанию нет), чтобы
// кривой id вернул 400, а не упал в Postgres с 500.
const uuidField = {
  type: 'string',
  pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
} as const;
const idParams = { type: 'object', required: ['id'], properties: { id: uuidField } } as const;

const cardFieldsSchema = {
  type: 'object',
  additionalProperties: false,
  minProperties: 1,
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 500 },
    description: { type: 'string', maxLength: 10000 },
    dueDate: { type: ['string', 'null'], pattern: datePattern },
    dueTime: { type: ['string', 'null'], pattern: timePattern },
  },
} as const;

const labelSchema = {
  type: 'object',
  required: ['name', 'color'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 40 },
    color: { type: 'string', enum: LABEL_COLORS },
  },
} as const;

// BoardError наружу — всегда 404, чтобы не раскрывать, существует ли чужой ресурс.
function handleBoardError(err: unknown, reply: FastifyReply): void {
  if (err instanceof BoardError) {
    reply.code(404).send({ error: 'Не найдено' });
    return;
  }
  throw err;
}

export async function boardRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);

  // Любое успешное изменение доски рассылаем клиентам, чтобы они обновились.
  app.addHook('onResponse', async (request, reply) => {
    if (request.method !== 'GET' && reply.statusCode < 300) {
      broadcastBoardChange();
    }
  });

  app.get('/boards', async (request, reply) => {
    const boards = await listBoards(request.user.sub);
    return reply.send({ boards });
  });

  app.get<{ Querystring: { boardId: string } }>(
    '/users',
    {
      preHandler: requireBoardQueryAccess,
      schema: {
        querystring: {
          type: 'object',
          required: ['boardId'],
          additionalProperties: false,
          properties: { boardId: uuidField },
        },
      },
    },
    async (request, reply) => {
      return reply.send({ users: await listMembers(request.query.boardId) });
    },
  );

  app.post<{ Body: { title: string } }>(
    '/boards',
    {
      schema: {
        body: {
          type: 'object',
          required: ['title'],
          additionalProperties: false,
          properties: { title: { type: 'string', minLength: 1, maxLength: 100 } },
        },
      },
    },
    async (request, reply) => {
      const board = await createBoard(request.user.sub, request.body.title.trim());
      return reply.code(201).send({ board });
    },
  );

  app.get<{ Params: { id: string } }>(
    '/boards/:id',
    { preHandler: requireBoardParamAccess, schema: { params: idParams } },
    async (request, reply) => {
      try {
        const board = await getBoard(request.params.id);
        return reply.send({ board });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.get<{ Params: { id: string } }>(
    '/boards/:id/archive',
    { preHandler: requireBoardParamAccess, schema: { params: idParams } },
    async (request, reply) => {
      try {
        const cards = await listArchivedCards(request.params.id);
        return reply.send({ cards });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  // Выгрузка доски в Excel: одна строка = карточка.
  app.get<{ Params: { id: string } }>(
    '/boards/:id/export',
    { preHandler: requireBoardParamAccess, schema: { params: idParams } },
    async (request, reply) => {
      try {
        const board = await getBoard(request.params.id);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Доска');
        sheet.columns = [
          { header: 'Колонка', key: 'list', width: 18 },
          { header: 'Задача', key: 'title', width: 42 },
          { header: 'Описание', key: 'description', width: 50 },
          { header: 'Метки', key: 'labels', width: 26 },
          { header: 'Ответственный', key: 'assignee', width: 20 },
          { header: 'Срок', key: 'due', width: 12 },
          { header: 'Чек-лист', key: 'checklist', width: 10 },
          { header: 'Комментариев', key: 'comments', width: 14 },
        ];
        sheet.getRow(1).font = { bold: true };
        sheet.views = [{ state: 'frozen', ySplit: 1 }];

        for (const list of board.lists) {
          for (const card of list.cards) {
            const done = card.checklist.filter((i) => i.done).length;
            sheet.addRow({
              list: list.title,
              title: card.title,
              description: card.description,
              labels: card.labels.map((l) => l.name).join(', '),
              assignee: card.assignee?.name ?? '',
              due: card.dueDate ?? '',
              checklist: card.checklist.length ? `${done}/${card.checklist.length}` : '',
              comments: card.comments.length || '',
            });
          }
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const filename = encodeURIComponent(`${board.title}.xlsx`);
        return reply
          .header(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          )
          .header(
            'Content-Disposition',
            `attachment; filename="board.xlsx"; filename*=UTF-8''${filename}`,
          )
          .send(Buffer.from(buffer));
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: { title: string } }>(
    '/boards/:id',
    {
      preHandler: requireBoardParamAccess,
      schema: {
        params: idParams,
        body: {
          type: 'object',
          required: ['title'],
          additionalProperties: false,
          properties: { title: { type: 'string', minLength: 1, maxLength: 100 } },
        },
      },
    },
    async (request, reply) => {
      try {
        const board = await renameBoard(request.params.id, request.body.title.trim());
        return reply.send({ board });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: { color: string | null } }>(
    '/boards/:id/color',
    {
      preHandler: requireBoardParamAccess,
      schema: {
        params: idParams,
        body: {
          type: 'object',
          required: ['color'],
          additionalProperties: false,
          // Ключ палитры (например 'blue') или null — палитру задаёт клиент.
          properties: { color: { type: ['string', 'null'], pattern: '^[a-z]{2,16}$' } },
        },
      },
    },
    async (request, reply) => {
      try {
        const board = await setBoardColor(request.params.id, request.body.color);
        return reply.send({ board });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: { folderId: string | null } }>(
    '/boards/:id/folder',
    {
      preHandler: requireBoardParamAccess,
      schema: {
        params: idParams,
        body: {
          type: 'object',
          required: ['folderId'],
          additionalProperties: false,
          properties: { folderId: { type: ['string', 'null'], pattern: uuidField.pattern } },
        },
      },
    },
    async (request, reply) => {
      try {
        const board = await setBoardFolder(request.params.id, request.body.folderId);
        return reply.send({ board });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: { position: number } }>(
    '/boards/:id/position',
    {
      preHandler: requireBoardParamAccess,
      schema: {
        params: idParams,
        body: {
          type: 'object',
          required: ['position'],
          additionalProperties: false,
          properties: { position: { type: 'number' } },
        },
      },
    },
    async (request, reply) => {
      try {
        await moveBoard(request.params.id, request.body.position);
        return reply.send({ ok: true });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/boards/:id',
    { preHandler: requireBoardParamAccess, schema: { params: idParams } },
    async (request, reply) => {
      try {
        await removeBoard(request.params.id);
        return reply.send({ ok: true });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.post<{ Body: { boardId: string; title: string } }>(
    '/lists',
    {
      preHandler: requireBoardBodyAccess,
      schema: {
        body: {
          type: 'object',
          required: ['boardId', 'title'],
          additionalProperties: false,
          properties: {
            boardId: uuidField,
            title: { type: 'string', minLength: 1, maxLength: 100 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const list = await addList(request.body.boardId, request.body.title.trim());
        return reply.code(201).send({ list });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: { title: string } }>(
    '/lists/:id',
    {
      preHandler: requireListParamAccess,
      schema: {
        params: idParams,
        body: {
          type: 'object',
          required: ['title'],
          additionalProperties: false,
          properties: { title: { type: 'string', minLength: 1, maxLength: 100 } },
        },
      },
    },
    async (request, reply) => {
      try {
        await renameList(request.params.id, request.body.title.trim());
        return reply.send({ ok: true });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: { color: string | null } }>(
    '/lists/:id/color',
    {
      preHandler: requireListParamAccess,
      schema: {
        params: idParams,
        body: {
          type: 'object',
          required: ['color'],
          additionalProperties: false,
          properties: { color: { type: ['string', 'null'], pattern: '^[a-z]{2,16}$' } },
        },
      },
    },
    async (request, reply) => {
      try {
        await setListColor(request.params.id, request.body.color);
        return reply.send({ ok: true });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: { position: number } }>(
    '/lists/:id/position',
    {
      preHandler: requireListParamAccess,
      schema: {
        params: idParams,
        body: {
          type: 'object',
          required: ['position'],
          additionalProperties: false,
          properties: { position: { type: 'number' } },
        },
      },
    },
    async (request, reply) => {
      try {
        await moveList(request.params.id, request.body.position);
        return reply.send({ ok: true });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/lists/:id',
    { preHandler: requireListParamAccess, schema: { params: idParams } },
    async (request, reply) => {
      try {
        await removeList(request.params.id);
        return reply.send({ ok: true });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.post<{ Body: { listId: string; title: string } }>(
    '/cards',
    {
      preHandler: requireListBodyAccess,
      schema: {
        body: {
          type: 'object',
          required: ['listId', 'title'],
          additionalProperties: false,
          properties: {
            listId: uuidField,
            title: { type: 'string', minLength: 1, maxLength: 500 },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const card = await addCard(request.body.listId, request.body.title.trim());
        return reply.code(201).send({ card });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/cards/:id',
    {
      preHandler: requireCardParamAccess,
      schema: { params: idParams, body: cardFieldsSchema },
    },
    async (request, reply) => {
      try {
        const card = await editCard(request.params.id, request.body);
        return reply.send({ card });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: { listId: string; position: number } }>(
    '/cards/:id/move',
    {
      preHandler: requireCardMoveAccess,
      schema: {
        params: idParams,
        body: {
          type: 'object',
          required: ['listId', 'position'],
          additionalProperties: false,
          properties: { listId: uuidField, position: { type: 'number' } },
        },
      },
    },
    async (request, reply) => {
      try {
        const card = await moveCard(request.params.id, request.body.listId, request.body.position);
        return reply.send({ card });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/cards/:id',
    { preHandler: requireCardParamAccess, schema: { params: idParams } },
    async (request, reply) => {
      try {
        await removeCard(request.params.id);
        return reply.send({ ok: true });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  // ── Метки ──
  app.post<{ Params: { id: string }; Body: { name: string; color: string } }>(
    '/boards/:id/labels',
    {
      preHandler: requireBoardParamAccess,
      schema: { params: idParams, body: labelSchema },
    },
    async (request, reply) => {
      try {
        const label = await createLabel(
          request.params.id,
          request.body.name.trim(),
          request.body.color,
        );
        return reply.code(201).send({ label });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: { name: string; color: string } }>(
    '/labels/:id',
    {
      preHandler: requireLabelParamAccess,
      schema: { params: idParams, body: labelSchema },
    },
    async (request, reply) => {
      try {
        const label = await editLabel(
          request.params.id,
          request.body.name.trim(),
          request.body.color,
        );
        return reply.send({ label });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/labels/:id',
    { preHandler: requireLabelParamAccess, schema: { params: idParams } },
    async (request, reply) => {
      try {
        await removeLabel(request.params.id);
        return reply.send({ ok: true });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: { labelId: string; active: boolean } }>(
    '/cards/:id/labels',
    {
      preHandler: requireCardLabelAccess,
      schema: {
        params: idParams,
        body: {
          type: 'object',
          required: ['labelId', 'active'],
          additionalProperties: false,
          properties: { labelId: uuidField, active: { type: 'boolean' } },
        },
      },
    },
    async (request, reply) => {
      try {
        const card = await toggleCardLabel(
          request.params.id,
          request.body.labelId,
          request.body.active,
        );
        return reply.send({ card });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: { userId: string | null } }>(
    '/cards/:id/assignee',
    {
      preHandler: requireCardParamAccess,
      schema: {
        params: idParams,
        body: {
          type: 'object',
          required: ['userId'],
          additionalProperties: false,
          properties: { userId: { type: ['string', 'null'], pattern: uuidField.pattern } },
        },
      },
    },
    async (request, reply) => {
      try {
        const card = await setCardAssignee(request.params.id, request.body.userId);
        return reply.send({ card });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: { done: boolean } }>(
    '/cards/:id/done',
    {
      preHandler: requireCardParamAccess,
      schema: {
        params: idParams,
        body: {
          type: 'object',
          required: ['done'],
          additionalProperties: false,
          properties: { done: { type: 'boolean' } },
        },
      },
    },
    async (request, reply) => {
      try {
        const card = await setCardDone(request.params.id, request.body.done);
        return reply.send({ card });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.post<{ Params: { id: string } }>(
    '/cards/:id/duplicate',
    { preHandler: requireCardParamAccess, schema: { params: idParams } },
    async (request, reply) => {
      try {
        const card = await duplicateCard(request.params.id);
        return reply.code(201).send({ card });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: { archived: boolean } }>(
    '/cards/:id/archive',
    {
      preHandler: requireCardParamAccess,
      schema: {
        params: idParams,
        body: {
          type: 'object',
          required: ['archived'],
          additionalProperties: false,
          properties: { archived: { type: 'boolean' } },
        },
      },
    },
    async (request, reply) => {
      try {
        await setCardArchived(request.params.id, request.body.archived);
        return reply.send({ ok: true });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  // ── Чек-лист ──
  app.post<{ Params: { id: string }; Body: { text: string } }>(
    '/cards/:id/checklist',
    {
      preHandler: requireCardParamAccess,
      schema: {
        params: idParams,
        body: {
          type: 'object',
          required: ['text'],
          additionalProperties: false,
          properties: { text: { type: 'string', minLength: 1, maxLength: 500 } },
        },
      },
    },
    async (request, reply) => {
      try {
        const item = await addChecklistItem(request.params.id, request.body.text.trim());
        return reply.code(201).send({ item });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: { text?: string; done?: boolean } }>(
    '/checklist/:id',
    {
      preHandler: requireChecklistParamAccess,
      schema: {
        params: idParams,
        body: {
          type: 'object',
          additionalProperties: false,
          minProperties: 1,
          properties: {
            text: { type: 'string', minLength: 1, maxLength: 500 },
            done: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const item = await editChecklistItem(request.params.id, request.body);
        return reply.send({ item });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: { position: number } }>(
    '/checklist/:id/position',
    {
      preHandler: requireChecklistParamAccess,
      schema: {
        params: idParams,
        body: {
          type: 'object',
          required: ['position'],
          additionalProperties: false,
          properties: { position: { type: 'number' } },
        },
      },
    },
    async (request, reply) => {
      try {
        const item = await moveChecklistItem(request.params.id, request.body.position);
        return reply.send({ item });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/checklist/:id',
    { preHandler: requireChecklistParamAccess, schema: { params: idParams } },
    async (request, reply) => {
      try {
        await removeChecklistItem(request.params.id);
        return reply.send({ ok: true });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  // ── Комментарии ──
  app.post<{ Params: { id: string }; Body: { text: string } }>(
    '/cards/:id/comments',
    {
      preHandler: requireCardParamAccess,
      schema: {
        params: idParams,
        body: {
          type: 'object',
          required: ['text'],
          additionalProperties: false,
          properties: { text: { type: 'string', minLength: 1, maxLength: 5000 } },
        },
      },
    },
    async (request, reply) => {
      try {
        const comment = await addComment(
          request.params.id,
          request.user.sub,
          request.body.text.trim(),
        );
        return reply.code(201).send({ comment });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    '/comments/:id',
    { preHandler: requireCommentParamAccess, schema: { params: idParams } },
    async (request, reply) => {
      try {
        await removeComment(request.params.id, request.user.sub);
        return reply.send({ ok: true });
      } catch (err) {
        return handleBoardError(err, reply);
      }
    },
  );
}
