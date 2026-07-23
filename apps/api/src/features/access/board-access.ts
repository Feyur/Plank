import type { FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../../config';
import { boardAccessRepo } from './access.repo';

type BoardResolver = (request: FastifyRequest) => string | null | Promise<string | null>;

function fromParams(request: FastifyRequest): string {
  return (request.params as { id: string }).id;
}

function fromBody(request: FastifyRequest, key: string): string {
  return (request.body as Record<string, string>)[key];
}

function requireResolvedBoardAccess(resolveBoard: BoardResolver) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const boardId = await resolveBoard(request);
    const allowed =
      boardId &&
      (await boardAccessRepo.hasBoardAccess(request.user.sub, boardId, config.accessAdminEmails));
    if (!allowed) {
      await reply.code(404).send({ error: 'Не найдено' });
    }
  };
}

export const requireBoardParamAccess = requireResolvedBoardAccess((request) => fromParams(request));

export const requireBoardQueryAccess = requireResolvedBoardAccess(
  (request) => (request.query as { boardId: string }).boardId,
);

export const requireBoardBodyAccess = requireResolvedBoardAccess((request) =>
  fromBody(request, 'boardId'),
);

export const requireListParamAccess = requireResolvedBoardAccess((request) =>
  boardAccessRepo.boardIdForList(fromParams(request)),
);

export const requireListBodyAccess = requireResolvedBoardAccess((request) =>
  boardAccessRepo.boardIdForList(fromBody(request, 'listId')),
);

export const requireCardParamAccess = requireResolvedBoardAccess((request) =>
  boardAccessRepo.boardIdForCard(fromParams(request)),
);

export const requireLabelParamAccess = requireResolvedBoardAccess((request) =>
  boardAccessRepo.boardIdForLabel(fromParams(request)),
);

export const requireChecklistParamAccess = requireResolvedBoardAccess((request) =>
  boardAccessRepo.boardIdForChecklistItem(fromParams(request)),
);

export const requireCommentParamAccess = requireResolvedBoardAccess((request) =>
  boardAccessRepo.boardIdForComment(fromParams(request)),
);

export const requireCardMoveAccess = requireResolvedBoardAccess(async (request) => {
  const [cardBoardId, listBoardId] = await Promise.all([
    boardAccessRepo.boardIdForCard(fromParams(request)),
    boardAccessRepo.boardIdForList(fromBody(request, 'listId')),
  ]);
  return cardBoardId && cardBoardId === listBoardId ? cardBoardId : null;
});

export const requireCardLabelAccess = requireResolvedBoardAccess(async (request) => {
  const [cardBoardId, labelBoardId] = await Promise.all([
    boardAccessRepo.boardIdForCard(fromParams(request)),
    boardAccessRepo.boardIdForLabel(fromBody(request, 'labelId')),
  ]);
  return cardBoardId && cardBoardId === labelBoardId ? cardBoardId : null;
});
