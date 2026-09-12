"use client";

import { useTranslations } from 'next-intl';

interface LabelSidebarProps {
    audioLaneCount?: number;
    motionTracksCount?: number;
    showCameraZoomRow?: boolean;
    dockTracksCount?: number;
    pointerTracksCount?: number;
    elementLaneCount?: number;
    showMovementRow?: boolean;
}

export default function LabelSidebar({
    audioLaneCount = 0,
    motionTracksCount = 0,
    showCameraZoomRow = false,
    dockTracksCount = 0,
    pointerTracksCount = 0,
    elementLaneCount = 0,
    showMovementRow = false,
}: LabelSidebarProps) {
    const t = useTranslations('labelSidebar');

    return (
        <div className="sticky left-0 w-14 border-r border-border grid grid-rows-subgrid bg-background z-30" style={{ gridColumn: 1, gridRow: '1 / -1' }}>
            <div className="border-b border-border" />

            <div className="flex items-center px-3">
                <span className="text-[9px] uppercase font-semibold tracking-wider text-muted-foreground">
                    {t('video')}
                </span>
            </div>

            <div
                className="flex items-center px-3 border-t border-border"
                style={{ gridRow: `span ${showCameraZoomRow ? 2 : 1}` }}
            >
                <span className="text-[9px] uppercase font-semibold tracking-wider text-muted-foreground">
                    {t('zoom')}
                </span>
            </div>

            {showMovementRow && (
                <div
                    className="flex items-center px-3 border-t border-dashed border-emerald-500/20 bg-emerald-500/5"
                >
                    <span className="text-[9px] uppercase font-semibold tracking-wider text-emerald-600/70 dark:text-emerald-400/70">
                        {t('movement')}
                    </span>
                </div>
            )}

            {elementLaneCount > 0 && (
                <div
                    className="flex items-center px-3 border-t border-border bg-muted/40"
                    style={{ gridRow: `span ${elementLaneCount}` }}
                >
                    <span className="text-[9px] uppercase font-semibold tracking-wider text-muted-foreground">
                        {t('elements')}
                    </span>
                </div>
            )}

            {audioLaneCount > 0 && (
                <div
                    className="flex items-center px-3 border-t border-border bg-muted/40"
                    style={{ gridRow: `span ${audioLaneCount}` }}
                >
                    <span className="text-[9px] uppercase font-semibold tracking-wider text-muted-foreground">
                        {t('audio')}
                    </span>
                </div>
            )}

            {dockTracksCount > 0 && <div className="flex items-center px-3 border-t border-sky-400/30"><span className="text-[9px] uppercase font-semibold text-sky-500">Dock</span></div>}
            {pointerTracksCount > 0 && <div className="flex items-center px-3 border-t border-violet-400/30"><span className="text-[9px] uppercase font-semibold text-violet-500">Mouse</span></div>}
            {motionTracksCount > 0 && (
                <div
                    className="flex items-center px-3 border-t border-border bg-muted/40"
                >
                    <span className="text-[9px] uppercase font-semibold tracking-wider text-muted-foreground">
                        {t('motion')}
                    </span>
                </div>
            )}
        </div>
    );
}
