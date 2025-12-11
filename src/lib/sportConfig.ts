export type FieldType = 'slider' | 'chips' | 'toggle' | 'tags' | 'date';

export interface FieldDef {
    key: string;
    label: string;
    type: FieldType;
    options?: string[]; // For chips, toggle
    min?: number; // For slider
    max?: number;
    unit?: string;
    tags?: string[]; // For tags
}

export interface SportDef {
    id: string;
    name: string;
    icon: string;
    color: string;
    border: string;
    fields: FieldDef[];
}

export const sportConfig: Record<string, Record<string, SportDef>> = {
    SOLO: {
        BOXING: {
            id: 'BOXING',
            name: 'Boxing / MMA',
            icon: '🥊',
            color: '#FEF2F2',
            border: '#FECACA',
            fields: [
                {
                    key: 'weight',
                    label: 'Weight Class',
                    type: 'slider',
                    min: 40,
                    max: 120,
                    unit: 'kg'
                },
                {
                    key: 'type',
                    label: 'Sparring Type',
                    type: 'chips',
                    options: ['Light', 'Hard', 'Technical', 'Drill']
                },
                {
                    key: 'tags',
                    label: 'Tags',
                    type: 'tags',
                    tags: ['#SafetyGear', '#NoEgo', '#ProOnly', '#Beginner']
                }
            ]
        },
        TENNIS: {
            id: 'TENNIS',
            name: 'Tennis / Badminton',
            icon: '🎾',
            color: '#EFF6FF',
            border: '#BFDBFE',
            fields: [
                {
                    key: 'mode',
                    label: 'Game Mode',
                    type: 'chips',
                    options: ['Single (1:1)', 'Double (2:2)']
                },
                {
                    key: 'court',
                    label: 'Court Type',
                    type: 'chips',
                    options: ['Hard', 'Clay', 'Grass', 'Indoor']
                },
                {
                    key: 'tags',
                    label: 'Tags',
                    type: 'tags',
                    tags: ['#Rally', '#Match', '#Lesson', '#Fun']
                }
            ]
        }
    },
    TEAM: {
        SOCCER: {
            id: 'SOCCER',
            name: 'Soccer / Futsal',
            icon: '⚽',
            color: '#F0FDF4',
            border: '#BBF7D0',
            fields: [
                {
                    key: 'format',
                    label: 'Format',
                    type: 'chips',
                    options: ['5vs5', '6vs6', '11vs11']
                },
                {
                    key: 'location',
                    label: 'Pitch Status',
                    type: 'toggle',
                    options: ['Reserving', 'Secured (Home)', 'Looking (Away)']
                },
                {
                    key: 'tags',
                    label: 'Team Vibe',
                    type: 'tags',
                    tags: ['#Friendly', '#Competitive', '#Uniform', '#RefIncluded']
                }
            ]
        },
        BASKETBALL: {
            id: 'BASKETBALL',
            name: 'Basketball',
            icon: '🏀',
            color: '#FFFAF0',
            border: '#FED7AA',
            fields: [
                {
                    key: 'format',
                    label: 'Format',
                    type: 'chips',
                    options: ['3on3', '5on5']
                },
                {
                    key: 'level',
                    label: 'Team Level',
                    type: 'slider',
                    min: 1,
                    max: 5,
                    unit: 'Lv'
                },
                {
                    key: 'tags',
                    label: 'Tags',
                    type: 'tags',
                    tags: ['#HalfCourt', '#FullCourt', '#Guest', '#LeagueRule']
                }
            ]
        }
    }
};
