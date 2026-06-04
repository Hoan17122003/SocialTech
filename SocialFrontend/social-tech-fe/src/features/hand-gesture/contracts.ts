export type LoverMediaType = 'image' | 'video';

export type LoverMediaItem = {
    id: string;
    type: LoverMediaType;
    url: string;
    title: string;
    rawType: string;
};
