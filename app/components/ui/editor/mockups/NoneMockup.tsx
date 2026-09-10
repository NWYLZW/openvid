"use client";

import { surfaceShadowCss } from "@/lib/surface-shadow";
import type { MockupRenderProps } from "@/types/mockup.types";

interface NoneMockupProps extends MockupRenderProps {
    roundedCorners?: number;
    shadows?: number;
}
export function NoneMockup({ children, config, className = "", roundedCorners = 12, shadows = 20 }: NoneMockupProps) {
    return (
        <div
            className={`relative w-full h-full overflow-hidden ${className}`}
            style={{
                borderRadius: `${roundedCorners / 8.96}cqmax`,
                boxShadow: surfaceShadowCss(shadows),
            }}
        >
            {children}
        </div>
    );
}