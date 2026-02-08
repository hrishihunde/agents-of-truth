export type TaskId = 'RESEARCH_PAPER' | 'BOOK_TRAVEL' | 'VERIFY_COMPLIANCE';

export interface TaskStep {
    id: string;
    name: string;
    description: string;
    type: 'init' | 'search' | 'payment' | 'process' | 'proof' | 'complete';
    service?: string;
    cost?: number;
}

export interface Task {
    id: TaskId;
    name: string;
    description: string;
    icon: string;
    estimatedCost: number;
    estimatedTime: string;
    steps: TaskStep[];
    deliverable: string;
}

export const TASKS: Record<TaskId, Task> = {
    RESEARCH_PAPER: {
        id: 'RESEARCH_PAPER',
        name: 'Prepare Research Document',
        description: 'Agent searches academic databases, retrieves papers, and compiles a research summary with citations.',
        icon: '📚',
        estimatedCost: 0.50,
        estimatedTime: '~30 seconds',
        steps: [
            { id: 'init', name: 'Initialize', description: 'Parse research topic', type: 'init' },
            { id: 'arxiv', name: 'Search ArXiv', description: 'Query open-access papers', type: 'payment', service: 'ArXiv API', cost: 0.10 },
            { id: 'ieee', name: 'Search IEEE', description: 'Query IEEE Xplore', type: 'payment', service: 'IEEE Xplore', cost: 0.25 },
            { id: 'researchgate', name: 'Search ResearchGate', description: 'Query ResearchGate', type: 'payment', service: 'ResearchGate', cost: 0.15 },
            { id: 'compile', name: 'Compile Document', description: 'Generate research summary', type: 'process' },
            { id: 'proof', name: 'Generate Proof', description: 'Create ZK compliance proof', type: 'proof' },
        ],
        deliverable: 'Research summary with paper citations',
    },
    BOOK_TRAVEL: {
        id: 'BOOK_TRAVEL',
        name: 'Book Travel Itinerary',
        description: 'Agent searches flights, hotels, and transport to create a complete travel itinerary.',
        icon: '✈️',
        estimatedCost: 0.45,
        estimatedTime: '~45 seconds',
        steps: [
            { id: 'init', name: 'Parse Request', description: 'Extract destination and dates', type: 'init' },
            { id: 'flights', name: 'Search Flights', description: 'Query flight aggregators', type: 'payment', service: 'Skyscanner', cost: 0.20 },
            { id: 'hotels', name: 'Search Hotels', description: 'Query hotel booking sites', type: 'payment', service: 'Booking.com', cost: 0.15 },
            { id: 'transport', name: 'Search Transport', description: 'Query local transport options', type: 'payment', service: 'Local Transport', cost: 0.10 },
            { id: 'compile', name: 'Build Itinerary', description: 'Compile travel plan', type: 'process' },
            { id: 'proof', name: 'Generate Proof', description: 'Create ZK compliance proof', type: 'proof' },
        ],
        deliverable: 'Complete travel itinerary with bookings',
    },
    VERIFY_COMPLIANCE: {
        id: 'VERIFY_COMPLIANCE',
        name: 'Verify Policy Compliance',
        description: 'Agent generates a zero-knowledge proof of policy compliance without executing any payments.',
        icon: '🔐',
        estimatedCost: 0,
        estimatedTime: '~5 seconds',
        steps: [
            { id: 'init', name: 'Load Policy', description: 'Resolve ENS policy', type: 'init' },
            { id: 'proof', name: 'Generate Proof', description: 'Create ZK compliance proof', type: 'proof' },
        ],
        deliverable: 'Verifiable ZK proof',
    },
};

export function getTask(id: TaskId): Task {
    return TASKS[id];
}

export function getAllTasks(): Task[] {
    return Object.values(TASKS);
}
