import * as React from 'react';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import type { Variants } from 'motion/react';

const enterEase:[number,number,number,number]=[0.22,1,0.36,1];
const exitEase:[number,number,number,number]=[0.4,0,1,1];

// Durations are seconds, matching motion/react. Features pass state, not timings.
export const motionTokens={
  duration:{feedback:0.16,viewEnter:0.22,viewExit:0.16},
  ease:{enter:enterEase,exit:exitEase},
  distance:{icon:2,view:8}
} as const;

export type MotionState='idle'|'hover'|'active'|'loading'|'success'|'error'|'disabled';

const iconVariants:Variants={
  idle:{opacity:1,scale:1,x:0,rotate:0,transition:{duration:motionTokens.duration.feedback,ease:motionTokens.ease.enter}},
  hover:{opacity:1,scale:1.06,x:0,rotate:0,transition:{duration:motionTokens.duration.feedback,ease:motionTokens.ease.enter}},
  active:{opacity:1,scale:0.94,x:0,rotate:0,transition:{duration:motionTokens.duration.feedback,ease:motionTokens.ease.enter}},
  loading:{opacity:1,scale:1,x:0,rotate:360,transition:{duration:1,ease:'linear',repeat:Infinity}},
  success:{opacity:1,scale:[1,1.12,1],x:0,rotate:0,transition:{duration:motionTokens.duration.viewEnter,ease:motionTokens.ease.enter}},
  error:{opacity:1,scale:1,x:[0,-motionTokens.distance.icon,motionTokens.distance.icon,0],rotate:0,transition:{duration:motionTokens.duration.viewEnter,ease:motionTokens.ease.enter}},
  disabled:{opacity:0.45,scale:1,x:0,rotate:0,transition:{duration:motionTokens.duration.feedback,ease:motionTokens.ease.exit}}
};

export function MotionIcon({state,children,label,className=''}: React.PropsWithChildren<{state:MotionState;label?:string;className?:string}>) {
  return <motion.span className={className} data-motion-state={state} role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true}
    initial={false} animate={state} variants={iconVariants} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',flex:'none',pointerEvents:'none'}}>{children}</motion.span>;
}

function WorkspaceSurface({children,className}: React.PropsWithChildren<{className?:string}>) {
  const isPresent=useIsPresent();
  return <motion.div className={className} data-motion-presence={isPresent?'entered':'exiting'} aria-hidden={isPresent?undefined:true}
    style={{pointerEvents:isPresent?'auto':'none'}}
    initial={{opacity:0,y:motionTokens.distance.view}}
    animate={{opacity:1,y:0,transition:{duration:motionTokens.duration.viewEnter,ease:motionTokens.ease.enter}}}
    exit={{opacity:0,y:-motionTokens.distance.view,transition:{duration:motionTokens.duration.viewExit,ease:motionTokens.ease.exit}}}>{children}</motion.div>;
}

// Wrap the changing toolbar, main stage or inspector content. Keep shell headers
// outside so a view switch does not remount global navigation or project state.
// The view owner moves keyboard focus before changing keys; exiting content
// becomes pointer-inert and leaves the tree after its exit animation.
export function WorkspaceTransition({transitionKey,children,className,onExitComplete}: React.PropsWithChildren<{transitionKey:string;className?:string;onExitComplete?:()=>void}>) {
  return <AnimatePresence mode="wait" initial={false} onExitComplete={onExitComplete}>
    <WorkspaceSurface key={transitionKey} className={className}>{children}</WorkspaceSurface>
  </AnimatePresence>;
}
