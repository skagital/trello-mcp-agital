#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;

if (!TRELLO_API_KEY || !TRELLO_TOKEN) {
  process.exit(1);
}

import { 
  listBoardsTool, getBoardDetailsTool, getListsTool,
  handleListBoards, handleGetBoardDetails, handleGetLists
} from './tools/boards.js';

import { 
  createCardTool, updateCardTool, moveCardTool, getCardTool,
  handleCreateCard, handleUpdateCard, handleMoveCard, handleGetCard
} from './tools/cards.js';

import { trelloSearchTool, handleTrelloSearch } from './tools/search.js';

import {
  trelloGetListCardsTool, handleTrelloGetListCards,
  trelloCreateListTool, handleTrelloCreateList,
  trelloAddCommentTool, handleTrelloAddComment
} from './tools/lists.js';

import {
  trelloGetUserBoardsTool, handleTrelloGetUserBoards,
  trelloGetMemberTool, handleTrelloGetMember
} from './tools/members.js';

import {
  trelloGetBoardCardsTool, handleTrelloGetBoardCards,
  trelloGetCardActionsTool, handleTrelloGetCardActions,
  trelloGetCardAttachmentsTool, handleTrelloGetCardAttachments,
  trelloGetCardChecklistsTool, handleTrelloGetCardChecklists,
  trelloGetBoardMembersTool, handleTrelloGetBoardMembers,
  trelloGetBoardLabelsTool, handleTrelloGetBoardLabels
} from './tools/advanced.js';

const server = new Server(
  {
    name: 'trello-agital',
    version: '1.2.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      trelloSearchTool, trelloGetUserBoardsTool, getBoardDetailsTool,
      getCardTool, createCardTool, updateCardTool, moveCardTool,
      trelloAddCommentTool, trelloGetListCardsTool, trelloCreateListTool,
      listBoardsTool, getListsTool, trelloGetMemberTool,
      trelloGetBoardCardsTool, trelloGetCardActionsTool,
      trelloGetCardAttachmentsTool, trelloGetCardChecklistsTool,
      trelloGetBoardMembersTool, trelloGetBoardLabelsTool
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const argsWithCredentials = { ...args, apiKey: TRELLO_API_KEY, token: TRELLO_TOKEN };
  
  switch (name) {
    case 'trello_search': return await handleTrelloSearch(argsWithCredentials);
    case 'trello_get_user_boards': return await handleTrelloGetUserBoards(argsWithCredentials);
    case 'get_board_details': return await handleGetBoardDetails(argsWithCredentials);
    case 'get_card': return await handleGetCard(argsWithCredentials);
    case 'create_card': return await handleCreateCard(argsWithCredentials);
    case 'update_card': return await handleUpdateCard(argsWithCredentials);
    case 'move_card': return await handleMoveCard(argsWithCredentials);
    case 'trello_add_comment': return await handleTrelloAddComment(argsWithCredentials);
    case 'trello_get_list_cards': return await handleTrelloGetListCards(argsWithCredentials);
    case 'trello_create_list': return await handleTrelloCreateList(argsWithCredentials);
    case 'list_boards': return await handleListBoards(argsWithCredentials);
    case 'get_lists': return await handleGetLists(argsWithCredentials);
    case 'trello_get_member': return await handleTrelloGetMember(argsWithCredentials);
    case 'trello_get_board_cards': return await handleTrelloGetBoardCards(argsWithCredentials);
    case 'trello_get_card_actions': return await handleTrelloGetCardActions(argsWithCredentials);
    case 'trello_get_card_attachments': return await handleTrelloGetCardAttachments(argsWithCredentials);
    case 'trello_get_card_checklists': return await handleTrelloGetCardChecklists(argsWithCredentials);
    case 'trello_get_board_members': return await handleTrelloGetBoardMembers(argsWithCredentials);
    case 'trello_get_board_labels': return await handleTrelloGetBoardLabels(argsWithCredentials);
    default: throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(() => {
  process.exit(1);
});