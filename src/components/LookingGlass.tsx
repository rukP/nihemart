import React from 'react';
import Magnifier from './Magnifier';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface LookingGlassProps {
  src: string;
  alt: string;
  zoomFactor: number;
  size?: number;
  cursorOffset?: { x: number; y: number };
  zoomSrc?: string;
  displayZoomOne?: boolean;
  scrollLinked?: boolean;
  squareMagnifier?: boolean;
  className?: string;
  imageClassName?: string;
  zoomClassName?: string;
  hideCursor?: boolean;
}

interface LookingGlassState {
  cursorPosition: { x: number; y: number };
  imageOffset: { x: number; y: number };
  mouseE: { clientX: number; clientY: number; pageX: number; pageY: number };
  hover: boolean;
}

class LookingGlass extends React.PureComponent<LookingGlassProps, LookingGlassState> {
  constructor(props: LookingGlassProps) {
    super(props);

    this.state = {
      cursorPosition: { x: 0, y: 0 },
      imageOffset: { x: 0, y: 0 },
      mouseE: { clientX: 0, clientY: 0, pageX: 0, pageY: 0 },
      hover: false
    };

    this.imageRef = React.createRef<HTMLImageElement | null>();
    this.containerRef = React.createRef<HTMLDivElement | null>();

    this.onEnter = this.onEnter.bind(this);
    this.onLeave = this.onLeave.bind(this);
    this.onMove = this.onMove.bind(this);
    this.setPosition = this.setPosition.bind(this);
  }

  private imageRef: React.RefObject<HTMLImageElement | null>;
  private containerRef: React.RefObject<HTMLDivElement | null>;

  onEnter(e: React.MouseEvent<HTMLImageElement> | React.TouchEvent<HTMLImageElement>) {
    this.onMove(e);
    this.setState({ hover: true });
  }

  onLeave() {
    this.setState({ hover: false });
  }

  onMove(e: React.MouseEvent<HTMLImageElement> | React.TouchEvent<HTMLImageElement>) {
    if ('touches' in e || 'changedTouches' in e) {
      const t = (e as React.TouchEvent<HTMLImageElement>).changedTouches?.[0] || (e as React.TouchEvent<HTMLImageElement>).touches?.[0];
      if (t && this.imageRef.current) {
        const cRect = this.imageRef.current.getBoundingClientRect();
        if (t.clientX >= cRect.left && t.clientX <= cRect.right && t.clientY >= cRect.top && t.clientY <= cRect.bottom) {
          this.setPosition({
            clientX: t.clientX,
            clientY: t.clientY,
            pageX: t.pageX,
            pageY: t.pageY
          });
        } else {
          this.onLeave();
        }
      }
    } else if ('clientX' in e && 'pageX' in e) {
      this.setPosition({
        clientX: (e as React.MouseEvent<HTMLImageElement>).clientX,
        clientY: (e as React.MouseEvent<HTMLImageElement>).clientY,
        pageX: (e as React.MouseEvent<HTMLImageElement>).pageX,
        pageY: (e as React.MouseEvent<HTMLImageElement>).pageY
      });
    } else {
      this.setPosition(this.state.mouseE);
    }
  }

  setPosition(mouseE: { clientX: number; clientY: number; pageX: number; pageY: number }) {
    if (this.imageRef.current && this.containerRef.current) {
      const cRect = this.imageRef.current.getBoundingClientRect();
      const containerRect = this.containerRef.current.getBoundingClientRect();
      this.setState({
        cursorPosition: {
          x: mouseE.pageX - containerRect.left,
          y: mouseE.pageY - containerRect.top
        },
        imageOffset: {
          x: mouseE.pageX - cRect.left - window.pageXOffset,
          y: mouseE.pageY - cRect.top - window.pageYOffset
        },
        mouseE
      });
    }
  }

  render() {
    const {
      src,
      alt,
      zoomFactor,
      displayZoomOne,
      scrollLinked,
      className,
      imageClassName,
      hideCursor,
      size = 200,
      cursorOffset = { x: 0, y: 0 },
      zoomSrc,
      squareMagnifier = false,
      zoomClassName
    } = this.props;
    const { hover, cursorPosition, imageOffset } = this.state;

    return (
      <div
        ref={this.containerRef}
        onScroll={scrollLinked ? (e) => this.onMove(e as any) : undefined}
        style={{
          position: 'relative',
          width: "100%",
          height: "100%",
          overflow: "hidden",
          touchAction: 'none',
        }}
        className={className}
      >
        <img
          src={src}
          alt={alt}
          onMouseEnter={this.onEnter}
          onMouseLeave={this.onLeave}
          onMouseMove={this.onMove}
          onTouchStart={this.onEnter}
          onTouchEnd={this.onLeave}
          onTouchCancel={this.onLeave}
          onTouchMove={this.onMove}
          ref={this.imageRef}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            touchAction: 'none',
            cursor: hideCursor ? "none" : "crosshair"
          }}
          className={imageClassName}
        />

        {hover && zoomFactor >= 1 && (displayZoomOne || zoomFactor !== 1) && (
          <Magnifier
            imageRef={this.imageRef}
            zoomFactor={zoomFactor}
            size={size}
            cursorOffset={cursorOffset}
            zoomSrc={zoomSrc}
            cursorPosition={cursorPosition}
            imageOffset={imageOffset}
            squareMagnifier={squareMagnifier}
            zoomClassName={cn(zoomClassName, '')}
          />
        )}
      </div>
    );
  }
}


export default LookingGlass;