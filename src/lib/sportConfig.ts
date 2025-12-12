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
            name: '복싱 / 킥복싱',
            icon: '🥊',
            color: '#EFF6FF',
            border: '#BFDBFE',
            fields: [
                {
                    key: 'weight',
                    label: '체급 (Weight)',
                    type: 'slider',
                    min: 45,
                    max: 120,
                    unit: 'kg'
                },
                {
                    key: 'type',
                    label: '스파링 강도',
                    type: 'chips',
                    options: ['매스', '라이트', '하드', '풀스파링'] // Localized chips
                },
                {
                    key: 'rounds',
                    label: '라운드 수',
                    type: 'chips',
                    options: ['3R', '4R', '6R', '8R', '10R'] // Pro Feature
                },
                {
                    key: 'gear',
                    label: '보호구 착용',
                    type: 'toggle',
                    options: ['풀기어 (헤드기어O)', '오픈 (헤드기어X)']
                },
                {
                    key: 'tags',
                    label: '추가 조건',
                    type: 'tags',
                    tags: ['#프로지망', '#생활체육', '#쉐도우만', '#지도자환영', '#초보가능']
                }
            ]
        }
    },
    TEAM: {
        SOCCER: {
            id: 'SOCCER',
            name: '축구 / 풋살',
            icon: '⚽',
            color: '#F0FDF4',
            border: '#BBF7D0',
            fields: [
                {
                    key: 'format',
                    label: '경기 방식',
                    type: 'chips',
                    options: ['5vs5', '6vs6', '11vs11']
                },
                {
                    key: 'location',
                    label: '구장 확보 여부',
                    type: 'toggle',
                    options: ['구장확보', '원정가능']
                },
                {
                    key: 'level',
                    label: '팀 수준',
                    type: 'chips',
                    options: ['선수출신 다수', '아마추어 중수', '친목/초보']
                },
                {
                    key: 'tags',
                    label: '매너/규칙',
                    type: 'tags',
                    tags: ['#선출환영', '#매너필수', '#자체심판', '#유니폼착용', '#음료지원']
                }
            ]
        }
    }
};
