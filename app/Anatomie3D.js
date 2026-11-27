"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import {
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Info,
  Layers,
  X,
} from "lucide-react";

/* =========================================================
   HUMAN ATLAS — DN MED STUDY
   Source : BodyParts3D 4.0
   2 234 maillages anatomiques
========================================================= */

const SYSTEMS = {
  skeletal: {
    name: "Système squelettique",
    color: "#E8D8B8",
  },
  muscular: {
    name: "Système musculaire",
    color: "#C96B68",
  },
  arterial: {
    name: "Système artériel",
    color: "#E53935",
  },
  venous: {
    name: "Système veineux",
    color: "#3979D8",
  },
  nervous: {
    name: "Système nerveux",
    color: "#F4D35E",
  },
  digestive: {
    name: "Système digestif",
    color: "#D99A52",
  },
  respiratory: {
    name: "Système respiratoire",
    color: "#D98AA8",
  },
  urinary: {
    name: "Système urinaire",
    color: "#9A79C8",
  },
  reproductive: {
    name: "Système reproducteur",
    color: "#B67A9B",
  },
  lymphatic: {
    name: "Système lymphatique",
    color: "#77B99A",
  },
  endocrine: {
    name: "Système endocrinien",
    color: "#E8B65C",
  },
  integumentary: {
    name: "Système tégumentaire",
    color: "#D7A58A",
  },
  connective: {
    name: "Tissus conjonctifs",
    color: "#AEC3BB",
  },
  sensory: {
    name: "Organes sensoriels",
    color: "#72B8C8",
  },
  cardiac: {
    name: "Système cardiaque",
    color: "#D94B55",
  },
};

const BACKGROUND = "#101827";

/* =========================================================
   CHARGEMENT DES DONNÉES ANATOMIQUES
========================================================= */

async function loadAtlas() {
  const response = await fetch("/models/atlas.json");

  if (!response.ok) {
    throw new Error(
      "Impossible de charger /models/atlas.json"
    );
  }

  const atlas = await response.json();

  if (
    !Array.isArray(atlas.parts) ||
    !Array.isArray(atlas.chunks)
  ) {
    throw new Error("Le manifeste anatomique est invalide.");
  }

  if (atlas.parts.length !== 2234) {
    throw new Error(
      `Nombre de structures inattendu : ${atlas.parts.length}`
    );
  }

  const root = new THREE.Group();
  root.name = "HumanAtlas";

  const materials = {};

  Object.entries(SYSTEMS).forEach(([id, system]) => {
    materials[id] = new THREE.MeshStandardMaterial({
      color: system.color,
      roughness: 0.72,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
  });

  const chunkBuffers = [];

  // Téléchargement des blocs anatomiques
  for (let i = 0; i < atlas.chunks.length; i++) {
    const chunk = atlas.chunks[i];

    const filename = chunk.url.split("/").pop();

    const fileResponse = await fetch(
      `/models/${encodeURIComponent(filename)}`
    );

    if (!fileResponse.ok) {
      throw new Error(
        `Impossible de charger le modèle ${filename}`
      );
    }

    const buffer = await fileResponse.arrayBuffer();

    if (buffer.byteLength !== chunk.bytes) {
      throw new Error(
        `Taille incorrecte pour ${filename}`
      );
    }

    chunkBuffers.push(buffer);
  }

  // Création des 2 234 structures
  for (const part of atlas.parts) {
    const buffer = chunkBuffers[part.chunk];

    if (!buffer) {
      throw new Error(
        `Bloc introuvable pour ${part.name}`
      );
    }

    const positions = new Float32Array(
      buffer,
      part.positions,
      part.vertexCount * 3
    );

    const normals = new Int16Array(
      buffer,
      part.normals,
      part.vertexCount * 3
    );

    const indices = new Uint32Array(
      buffer,
      part.indices,
      part.indexCount
    );

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );

    geometry.setAttribute(
      "normal",
      new THREE.BufferAttribute(normals, 3, true)
    );

    geometry.setIndex(
      new THREE.BufferAttribute(indices, 1)
    );

    const system = part.system || "connective";

    const material =
      materials[system] ||
      new THREE.MeshStandardMaterial({
        color: "#B8B8B8",
        roughness: 0.75,
        side: THREE.DoubleSide,
      });

    const mesh = new THREE.Mesh(geometry, material);

    mesh.name = part.name;

    mesh.userData = {
      id: part.id,
      name: part.name,
      conceptId: part.conceptId,
      system,
      baseMaterial: material,
    };

    // Toutes les structures sont cachées au départ.
    mesh.visible = false;

    root.add(mesh);
  }

  // Centrage et mise à l'échelle du corps entier
  const bounds = new THREE.Box3().setFromObject(root);

  const center = new THREE.Vector3();
  const size = new THREE.Vector3();

  bounds.getCenter(center);
  bounds.getSize(size);

  root.position.sub(center);

  const maxDimension = Math.max(
    size.x,
    size.y,
    size.z
  );

  const scale =
    maxDimension > 0 ? 2.7 / maxDimension : 1;

  root.scale.setScalar(scale);

  root.updateMatrixWorld(true);

  return {
    root,
    atlas,
    materials,
  };
}

/* =========================================================
   SCÈNE 3D — SÉLECTION ANATOMIQUE CORRIGÉE
========================================================= */

function AnatomicalScene({
  model,
  visibleSystems,
  selectedConcept,
  isolate,
  onSelect,
  controlsRef,
}) {
  const { camera, gl } = useThree();

  const raycaster = useMemo(
    () => new THREE.Raycaster(),
    []
  );

  // Visibilité des systèmes
  useEffect(() => {
    if (!model) return;

    model.root.traverse((object) => {
      if (!object.isMesh) return;

      const system = object.userData.system;

      const systemVisible =
        visibleSystems.includes(system);

      const objectKey =
        object.userData.conceptId ??
        object.userData.id;

      const selected =
        selectedConcept != null &&
        objectKey === selectedConcept;

      object.visible =
        systemVisible &&
        (!isolate || !selectedConcept || selected);
    });
  }, [
    model,
    visibleSystems,
    selectedConcept,
    isolate,
  ]);

  // Mise en évidence de la structure sélectionnée
  useEffect(() => {
    if (!model) return;

    model.root.traverse((object) => {
      if (!object.isMesh) return;

      const baseMaterial =
        object.userData.baseMaterial;

      if (!baseMaterial) return;

      // Restaurer le matériau original
      if (object.material !== baseMaterial) {
        object.material.dispose();
        object.material = baseMaterial;
      }

      const objectKey =
        object.userData.conceptId ??
        object.userData.id;

      // Mettre en évidence la structure sélectionnée
      if (
        selectedConcept != null &&
        objectKey === selectedConcept
      ) {
        const highlighted = baseMaterial.clone();

        highlighted.emissive = new THREE.Color(
          "#00C8FF"
        );

        highlighted.emissiveIntensity = 0.55;

        highlighted.color =
          baseMaterial.color.clone();

        object.material = highlighted;
      }
    });
  }, [model, selectedConcept]);

  /* -------------------------------------------------------
     DÉTECTION DIRECTE DES STRUCTURES PAR RAYCASTING
  ------------------------------------------------------- */

  useEffect(() => {
    if (!model) return;

    const canvas = gl.domElement;

    let startPointer = null;

    const handlePointerDown = (event) => {
      startPointer = {
        x: event.clientX,
        y: event.clientY,
        id: event.pointerId,
      };
    };

    const handlePointerCancel = () => {
      startPointer = null;
    };

    const handlePointerUp = (event) => {
      if (
        !startPointer ||
        startPointer.id !== event.pointerId
      ) {
        startPointer = null;
        return;
      }

      const distance = Math.hypot(
        event.clientX - startPointer.x,
        event.clientY - startPointer.y
      );

      startPointer = null;

      // Ne pas sélectionner pendant une rotation.
      if (distance > 8) return;

      const rect = canvas.getBoundingClientRect();

      if (!rect.width || !rect.height) return;

      const pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) *
          2 -
          1,
        -(
          ((event.clientY - rect.top) / rect.height) *
            2 -
          1
        )
      );

      camera.updateMatrixWorld(true);
      model.root.updateMatrixWorld(true);

      raycaster.setFromCamera(pointer, camera);

      const intersections =
        raycaster.intersectObjects(
          model.root.children,
          true
        );

      // Vérifier la visibilité de la structure
      // ainsi que celle de ses parents.
      const isVisible = (object) => {
        let current = object;

        while (current) {
          if (!current.visible) return false;

          if (current === model.root) break;

          current = current.parent;
        }

        return true;
      };

      // Prendre la première structure réellement
      // sélectionnable parmi les intersections.
      const hit = intersections.find(
        ({ object }) => {
          return (
            object.isMesh &&
            object.userData?.id != null &&
            isVisible(object)
          );
        }
      );

      if (!hit) return;

      onSelect(hit.object.userData);
    };

    canvas.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    canvas.addEventListener(
      "pointerup",
      handlePointerUp
    );

    canvas.addEventListener(
      "pointercancel",
      handlePointerCancel
    );

    return () => {
      canvas.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      canvas.removeEventListener(
        "pointerup",
        handlePointerUp
      );

      canvas.removeEventListener(
        "pointercancel",
        handlePointerCancel
      );
    };
  }, [
    model,
    gl,
    camera,
    raycaster,
    onSelect,
  ]);

  if (!model) return null;

  return (
    <>
      <ambientLight intensity={1.15} />

      <directionalLight
        position={[4, 6, 5]}
        intensity={2.1}
      />

      <directionalLight
        position={[-4, 2, -4]}
        intensity={1}
      />

      <directionalLight
        position={[0, -3, 4]}
        intensity={0.5}
      />

      <primitive object={model.root} />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.07}
        rotateSpeed={0.75}
        zoomSpeed={0.85}
        minDistance={0.8}
        maxDistance={10}
        target={[0, 0, 0]}
      />
    </>
  );
}

/* =========================================================
   COMPOSANT PRINCIPAL
========================================================= */

export default function Anatomie3D() {
  const [model, setModel] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [visibleSystems, setVisibleSystems] = useState([]);

  const [selected, setSelected] = useState(null);

  const [isolate, setIsolate] = useState(false);

  const [showInfo, setShowInfo] = useState(true);

  const controlsRef = useRef(null);

  /* Chargement du modèle */

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        setLoading(true);
        setError("");

        const result = await loadAtlas();

        if (cancelled) {
          result.root.traverse((object) => {
            if (object.isMesh) {
              object.geometry.dispose();
            }
          });

          return;
        }

        setModel(result);
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(
            err.message ||
              "Une erreur est survenue pendant le chargement."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    start();

    return () => {
      cancelled = true;
    };
  }, []);

  /* Sélection d'une structure */

  const handleSelect = useCallback((part) => {
    setSelected({
      ...part,
    });

    setShowInfo(true);
    setIsolate(false);
  }, []);

  /* Afficher / masquer un système */

  const toggleSystem = useCallback((systemId) => {
    setVisibleSystems((previous) => {
      if (previous.includes(systemId)) {
        return previous.filter(
          (item) => item !== systemId
        );
      }

      return [...previous, systemId];
    });
  }, []);

  /* Tout afficher */

  const showAllSystems = () => {
    setVisibleSystems(Object.keys(SYSTEMS));
    setIsolate(false);
  };

  /* Tout masquer */

  const hideAllSystems = () => {
    setVisibleSystems([]);
    setSelected(null);
    setIsolate(false);
  };

  /* Isolation de la structure sélectionnée */

  const isolateStructure = () => {
    if (!selected) return;

    setVisibleSystems((previous) => {
      if (!previous.includes(selected.system)) {
        return [...previous, selected.system];
      }

      return previous;
    });

    setIsolate(true);
  };

  /* Zoom */

  const zoomIn = () => {
    const controls = controlsRef.current;

    if (!controls) return;

    const camera = controls.object;

    const direction = new THREE.Vector3();

    direction.subVectors(
      camera.position,
      controls.target
    );

    direction.multiplyScalar(0.8);

    camera.position.copy(
      controls.target.clone().add(direction)
    );

    controls.update();
  };

  const zoomOut = () => {
    const controls = controlsRef.current;

    if (!controls) return;

    const camera = controls.object;

    const direction = new THREE.Vector3();

    direction.subVectors(
      camera.position,
      controls.target
    );

    direction.multiplyScalar(1.25);

    camera.position.copy(
      controls.target.clone().add(direction)
    );

    controls.update();
  };

  /* Libellé du système sélectionné */

  const selectedSystem = selected
    ? SYSTEMS[selected.system]?.name ||
      selected.system
    : "";

  /* =====================================================
     AFFICHAGE
  ===================================================== */

  return (
    <div
      style={{
        width: "100%",
        minHeight: "700px",
        background: "#F4F6FA",
        borderRadius: "16px",
        overflow: "hidden",
        color: "#172337",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* EN-TÊTE */}

      <div
        style={{
          padding: "18px",
          background: "#10243A",
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "21px",
                fontWeight: "800",
                margin: 0,
              }}
            >
              Anatomie 3D
            </h2>

            <p
              style={{
                margin: "5px 0 0",
                fontSize: "12px",
                color: "#B9C8D9",
              }}
            >
              Exploration anatomique interactive
            </p>
          </div>

          <div
            style={{
              background: "#1E3B59",
              padding: "7px 12px",
              borderRadius: "20px",
              fontSize: "12px",
            }}
          >
            Human Atlas
          </div>
        </div>
      </div>

      {/* ZONE PRINCIPALE */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
        }}
      >
        {/* VISUALISEUR */}

        <div
          style={{
            position: "relative",
            height: "570px",
            background: BACKGROUND,
          }}
        >
          {loading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 5,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                gap: "15px",
              }}
            >
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  border: "4px solid #42546B",
                  borderTopColor: "#06B6D4",
                  borderRadius: "50%",
                  animation:
                    "dnSpin 1s linear infinite",
                }}
              />

              <strong>
                Chargement de l'anatomie...
              </strong>

              <span
                style={{
                  fontSize: "12px",
                  color: "#A9B7C8",
                }}
              >
                Préparation des structures 3D
              </span>
            </div>
          )}

          {error && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "25px",
                color: "#FFB4B4",
                textAlign: "center",
              }}
            >
              <div>
                <strong>
                  Erreur de chargement
                </strong>

                <p style={{ fontSize: "13px" }}>
                  {error}
                </p>

                <p
                  style={{
                    fontSize: "12px",
                    color: "#C5D0DC",
                  }}
                >
                  Vérifie la présence de atlas.json et
                  des fichiers body-*.bin dans
                  public/models/.
                </p>
              </div>
            </div>
          )}

          {!error && model && (
            <Canvas
              camera={{
                position: [0, 0, 4.8],
                fov: 36,
                near: 0.01,
                far: 100,
              }}
              gl={{
                antialias: true,
                alpha: false,
              }}
              dpr={[1, 1.5]}
              style={{
                width: "100%",
                height: "100%",
                touchAction: "none",
              }}
            >
              <color
                attach="background"
                args={[BACKGROUND]}
              />

              <AnatomicalScene
                model={model}
                visibleSystems={visibleSystems}
                selectedConcept={
                  selected?.conceptId ??
                  selected?.id ??
                  null
                }
                isolate={isolate}
                onSelect={handleSelect}
                controlsRef={controlsRef}
              />
            </Canvas>
          )}

          {/* COMMANDES DE ZOOM */}

          <div
            style={{
              position: "absolute",
              right: "12px",
              bottom: "15px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              zIndex: 4,
            }}
          >
            <button
              onClick={zoomIn}
              title="Zoom avant"
              style={controlButton}
            >
              <ZoomIn size={19} />
            </button>

            <button
              onClick={zoomOut}
              title="Zoom arrière"
              style={controlButton}
            >
              <ZoomOut size={19} />
            </button>

            <button
              onClick={() => setShowInfo((v) => !v)}
              title="Informations"
              style={controlButton}
            >
              <Info size={19} />
            </button>
          </div>

          {/* INDICATION */}

          {!loading &&
            !error &&
            visibleSystems.length === 0 && (
              <div
                style={{
                  position: "absolute",
                  left: "12px",
                  bottom: "15px",
                  padding: "9px 12px",
                  borderRadius: "9px",
                  background: "#203248",
                  color: "#DCE7F2",
                  fontSize: "11px",
                  zIndex: 3,
                }}
              >
                Active un système pour afficher les
                structures.
              </div>
            )}
        </div>

        {/* PANNEAUX */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: "12px",
            padding: "14px",
          }}
        >
          {/* SYSTÈMES */}

          <section
            style={{
              background: "white",
              padding: "15px",
              borderRadius: "12px",
              border: "1px solid #E3E8EF",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <h3
                style={{
                  fontSize: "15px",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                }}
              >
                <Layers size={17} />

                Systèmes anatomiques
              </h3>

              <span
                style={{
                  fontSize: "11px",
                  color: "#718096",
                }}
              >
                {visibleSystems.length} actif(s)
              </span>
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "13px",
                marginBottom: "13px",
              }}
            >
              <button
                onClick={showAllSystems}
                style={smallButton}
              >
                Tout afficher
              </button>

              <button
                onClick={hideAllSystems}
                style={smallButton}
              >
                Tout masquer
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(145px, 1fr))",
                gap: "8px",
              }}
            >
              {Object.entries(SYSTEMS).map(
                ([id, system]) => {
                  const active =
                    visibleSystems.includes(id);

                  return (
                    <button
                      key={id}
                      onClick={() => toggleSystem(id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        textAlign: "left",
                        padding: "10px",
                        borderRadius: "9px",
                        border: active
                          ? "1px solid #2563EB"
                          : "1px solid #E2E8F0",
                        background: active
                          ? "#EFF6FF"
                          : "#FFFFFF",
                        color: "#26364A",
                        cursor: "pointer",
                        fontSize: "11px",
                        fontWeight: active
                          ? "700"
                          : "500",
                      }}
                    >
                      <span
                        style={{
                          width: "11px",
                          height: "11px",
                          flexShrink: 0,
                          borderRadius: "50%",
                          background: system.color,
                        }}
                      />

                      <span style={{ flex: 1 }}>
                        {system.name}
                      </span>

                      {active ? (
                        <Eye size={14} />
                      ) : (
                        <EyeOff
                          size={14}
                          color="#A0AEC0"
                        />
                      )}
                    </button>
                  );
                }
              )}
            </div>
          </section>

          {/* STRUCTURE SÉLECTIONNÉE */}

          {selected && showInfo && (
            <section
              style={{
                background: "white",
                padding: "15px",
                borderRadius: "12px",
                border: "1px solid #D7E5F4",
                boxShadow:
                  "0 3px 12px rgba(20,40,70,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <h3
                  style={{
                    fontSize: "15px",
                    margin: 0,
                  }}
                >
                  Structure sélectionnée
                </h3>

                <button
                  onClick={() => {
                    setSelected(null);
                    setIsolate(false);
                  }}
                  style={{
                    border: 0,
                    background: "#F1F5F9",
                    borderRadius: "7px",
                    padding: "6px",
                    cursor: "pointer",
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <h2
                style={{
                  fontSize: "19px",
                  color: "#1D4ED8",
                  margin: "13px 0 7px",
                }}
              >
                {selected.name}
              </h2>

              <p
                style={{
                  fontSize: "12px",
                  color: "#64748B",
                  margin: "5px 0",
                }}
              >
                Système : {selectedSystem}
              </p>

              <p
                style={{
                  fontSize: "11px",
                  color: "#94A3B8",
                  margin: "5px 0",
                  wordBreak: "break-all",
                }}
              >
                Identifiant : {selected.id}
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "14px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={isolateStructure}
                  style={primaryButton}
                >
                  Isoler cette structure
                </button>

                {isolate && (
                  <button
                    onClick={() => setIsolate(false)}
                    style={smallButton}
                  >
                    Voir le système
                  </button>
                )}
              </div>
            </section>
          )}

          {/* AIDE */}

          {showInfo && (
            <section
              style={{
                background: "#EFF6FF",
                padding: "13px",
                borderRadius: "10px",
                border: "1px solid #DCEBFA",
              }}
            >
              <strong
                style={{
                  fontSize: "12px",
                  color: "#1E40AF",
                }}
              >
                Comment utiliser l'atlas ?
              </strong>

              <p
                style={{
                  fontSize: "11px",
                  lineHeight: 1.6,
                  color: "#475569",
                  margin: "7px 0 0",
                }}
              >
                Active un ou plusieurs systèmes
                anatomiques. Touche ensuite une structure
                du modèle pour afficher son nom et ses
                informations disponibles. Fais glisser
                ton doigt pour tourner le corps et utilise
                deux doigts pour zoomer.
              </p>
            </section>
          )}

          {/* ATTRIBUTION */}

          <p
            style={{
              fontSize: "10px",
              color: "#94A3B8",
              lineHeight: 1.5,
              margin: "0 2px 8px",
            }}
          >
            Données anatomiques : BodyParts3D 4.0.
            Licence CC BY 4.0. Adaptation et visualisation
            éducative. Ce modèle ne constitue pas un outil
            de diagnostic médical.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes dnSpin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

/* =========================================================
   STYLES DES BOUTONS
========================================================= */

const controlButton = {
  width: "40px",
  height: "40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#263A52",
  color: "white",
  border: "1px solid #52657A",
  borderRadius: "10px",
  cursor: "pointer",
};

const smallButton = {
  padding: "8px 11px",
  background: "#F1F5F9",
  color: "#334155",
  border: "1px solid #E2E8F0",
  borderRadius: "8px",
  fontSize: "11px",
  fontWeight: "600",
  cursor: "pointer",
};

const primaryButton = {
  padding: "9px 13px",
  background: "#2563EB",
  color: "white",
  border: "none",
  borderRadius: "8px",
  fontSize: "11px",
  fontWeight: "700",
  cursor: "pointer",
};
