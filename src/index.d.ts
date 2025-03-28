import { Ref, ComputedRef, Component } from 'vue';

export interface DebugInfo {
    status: Ref<string>;
    subscriptions: Ref<Array<Subscription>>;
    values: Record<string, any>;
}

export interface Subscription {
    id: number;
    objectPath: string;
    propertyPath: string;
}

export interface UseLiveUpdateReturn {
    status: Ref<string>;
    connectionUserInfo: Ref<string>;
    reconnect: () => void;
    subscribe: (
        objectPath: string,
        refNameToPropertyPaths: Record<string, string>
    ) => Record<string, ComputedRef<any>>;
    autoSubscribe: (
        objectPath: string,
        propertyPaths: string[]
    ) => Record<string, ComputedRef<any>>;
    debugInfo: DebugInfo;
}

export interface LiveUpdateOverlayProps {
    liveUpdate: UseLiveUpdateReturn;
}

/**
 * Initializes the live update system with a WebSocket connection.
 * @param director - The WebSocket IP endpoint (host:port) to connect to.
 * @returns The live update API including status, subscribe, autoSubscribe, and debugInfo.
 */
export function useLiveUpdate(director: string): UseLiveUpdateReturn;

/**
 * A Vue component that displays the connection status and provides reconnection functionality.
 * @param props - Component props including the liveUpdate instance
 */
export const LiveUpdateOverlay: Component<LiveUpdateOverlayProps>; 