// WebSocket message types from backend

export interface CommandExecutedMessage {
    type: 'command_executed';
    timestamp: string;
    data: {
        user_id: string;
        username: string;
        command: string;
        payload?: any;
    };
}

export interface StatusUpdateMessage {
    type: 'status_update';
    timestamp: string;
    data: {
        status: any;
    };
}

export interface UserConnectionMessage {
    type: 'user_connected' | 'user_disconnected';
    timestamp: string;
    data: {
        user_id: string;
        username: string;
    };
}

export type WebSocketMessage = CommandExecutedMessage | StatusUpdateMessage | UserConnectionMessage;
