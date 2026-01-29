import React from 'react';

interface MagnifierProps {
  imageRef: React.RefObject<HTMLImageElement | null>;
  zoomFactor: number;
  size: number;
  cursorOffset: { x: number; y: number };
  zoomSrc?: string;
  cursorPosition: { x: number; y: number };
  imageOffset: { x: number; y: number };
  squareMagnifier?: boolean;
  zoomClassName?: string;
}

class Magnifier extends React.PureComponent<MagnifierProps> {
  render() {
    const { imageRef, zoomFactor, size, cursorOffset, zoomSrc, cursorPosition, imageOffset, squareMagnifier, zoomClassName } = this.props;

    const halfSize = size / 2;
    const bgX = (-zoomFactor * imageOffset.x) + halfSize;
    const bgY = (-zoomFactor * imageOffset.y) + halfSize;

    const imageWidth = imageRef.current?.offsetWidth || 0;
    const imageHeight = imageRef.current?.offsetHeight || 0;
    const imageSrc = imageRef.current?.src || '';

    return (
      <div
        style={{
          position: 'absolute',
          display: 'block',
          top: cursorPosition.y,
          left: cursorPosition.x,
          width: size,
          height: size,
          marginLeft: cursorOffset.x - halfSize,
          marginTop: cursorOffset.y - halfSize,
          backgroundColor: 'white',
          borderRadius: !squareMagnifier ? "50%" : "0%",
          boxShadow: `1px 1px 6px rgba(0,0,0,0.3)`,
          touchAction: 'none',
          pointerEvents: 'none',
          zIndex: 9999,
        }}
        className={zoomClassName}
      >
        <div
          style={{
            width: size,
            height: size,
            backgroundImage: `url("${zoomSrc || imageSrc}")`,
            backgroundSize: `${imageWidth * zoomFactor}px ${imageHeight * zoomFactor}px`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: `${bgX}px ${bgY}px`,
            borderRadius: !squareMagnifier ? "50%" : "0%",
            touchAction: 'none',
            pointerEvents: 'none'
          }}
        />
      </div>
    );
  }
}

export default Magnifier;