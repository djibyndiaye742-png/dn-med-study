"use client";


import "./polyfills";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";


import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";


pdfjs.GlobalWorkerOptions.workerSrc =
https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs;


class PdfErrorBoundary extends React.Component {
constructor(props) {
super(props);
this.state = { error: null };
}


static getDerivedStateFromError(error) {
return { error };
}


componentDidCatch(error) {
console.error("ERREUR LECTEUR PDF :", error);
}


render() {
if (this.state.error) {
return (



←



Erreur du lecteur PDF



{String(this.state.error)}




);
}



return this.props.children;



}
}


function PdfViewerContent({ url, onClose }) {
const [numPages, setNumPages] = useState(0);
const [pageNumber, setPageNumber] = useState(1);
const [error, setError] = useState("");
const [pageDimensions, setPageDimensions] = useState(null);
const [containerSize, setContainerSize] = useState({
width: 0,
height: 0,
});


const containerRef = useRef(null);
const touchStartX = useRef(0);
const touchStartY = useRef(0);


useEffect(() => {
const element = containerRef.current;
if (!element) return;


const updateSize = () => {
  setContainerSize({
    width: element.clientWidth,
    height: element.clientHeight,
  });
};

updateSize();

const observer = new ResizeObserver(updateSize);
observer.observe(element);

return () => observer.disconnect();



}, []);


async function handleDocumentLoad(pdf) {
setNumPages(pdf.numPages);
setPageNumber(1);


try {
  const firstPage = await pdf.getPage(1);
  const viewport = firstPage.getViewport({ scale: 1 });

  setPageDimensions({
    width: viewport.width,
    height: viewport.height,
  });
} catch (err) {
  console.error(err);
  setError("Impossible de lire les dimensions du document.");
}



}


const pageWidth = (() => {
if (!pageDimensions || !containerSize.width || !containerSize.height) {
return 0;
}


const widthRatio = containerSize.width / pageDimensions.width;
const heightRatio = containerSize.height / pageDimensions.height;

return Math.floor(
  Math.min(widthRatio, heightRatio) * pageDimensions.width
);



})();


const previousPage = useCallback(() => {
setPageNumber((current) => Math.max(1, current - 1));
}, []);


const nextPage = useCallback(() => {
setPageNumber((current) => Math.min(numPages, current + 1));
}, [numPages]);


function handleTouchStart(event) {
touchStartX.current = event.changedTouches[0].clientX;
touchStartY.current = event.changedTouches[0].clientY;
}


function handleTouchEnd(event) {
const deltaX = event.changedTouches[0].clientX - touchStartX.current;
const deltaY = event.changedTouches[0].clientY - touchStartY.current;


if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY)) {
  if (deltaX < 0) nextPage();
  else previousPage();
}



}


useEffect(() => {
function handleKeyDown(event) {
if (event.key === "ArrowRight") nextPage();
if (event.key === "ArrowLeft") previousPage();
if (event.key === "Escape") onClose?.();
}


window.addEventListener("keydown", handleKeyDown);
return () => window.removeEventListener("keydown", handleKeyDown);



}, [nextPage, previousPage, onClose]);


useEffect(() => {
return () => {
try {
screen.orientation?.unlock?.();
} catch {}
};
}, []);


return (



←




  <main
    ref={containerRef}
    onTouchStart={handleTouchStart}
    onTouchEnd={handleTouchEnd}
    className="flex h-full w-full items-center justify-center overflow-hidden"
  >
    {error ? (
      <p className="p-5 text-center text-red-400">{error}</p>
    ) : (
      <Document
        file={url}
        onLoadSuccess={handleDocumentLoad}
        onLoadError={(err) => setError(String(err))}
        loading={<p>Chargement du cours...</p>}
      >
        {pageWidth > 0 && (
          <Page
            pageNumber={pageNumber}
            width={pageWidth}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            loading={<p>Chargement de la diapositive...</p>}
          />
        )}
      </Document>
    )}
  </main>
</div>



);
}


export default function PdfViewer(props) {
return (

<PdfViewerContent {...props} />

);
}
