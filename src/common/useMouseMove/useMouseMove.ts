//Fork of https://github.com/hamfz/react-use-mouse-move/tree/master
import { useEffect, useState, useMemo } from 'react';

function useMouseMove(throttle: number, targetPos: string, targetId?: string) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  let prevPos = pos;

  throttle = useMemo(() => Math.max(1, Math.min(throttle, 10)), [throttle]);

  const throttlePos = (prevPos: {x: number, y: number}, x: number, y: number) => {
    return {
      x: Math.abs(prevPos.x - x) % throttle === 0 ? x : prevPos.x,
      y: Math.abs(prevPos.y - y) % throttle === 0 ? y : prevPos.y
    };
  }

  const moveHandler = (evt: MouseEvent) => {
    const { altKey, ctrlKey, metaKey, shiftKey } = evt;
    const { x, y } = throttlePos(
      prevPos,
      targetPos === 'client' ? evt.clientX : targetPos === 'page' ? evt.pageX : targetPos === 'screen' ? evt.screenX : evt.x,
      targetPos === 'client' ? evt.clientY : targetPos === 'page' ? evt.pageY : targetPos === 'screen' ? evt.screenY : evt.x,
    );

    const nextPos = {
      x,
      y,
      keydown: {
        altKey,
        ctrlKey,
        metaKey,
        shiftKey
      }
    };

    if (prevPos !== nextPos) {
      setPos(nextPos);
      prevPos = nextPos;
    }
  }

  useEffect(() => {
    let targetElement: Window | HTMLElement = window;
    if (targetId) {
      let tempTargetElement = document.getElementById(targetId)
      if (tempTargetElement) {
        targetElement = tempTargetElement;
      }
    }

    targetElement.addEventListener('mousemove', moveHandler as EventListenerOrEventListenerObject);
    return () => {
      targetElement.removeEventListener('mousemove', moveHandler as EventListenerOrEventListenerObject);
    };
  }, []);

  return pos;
}

export { useMouseMove }