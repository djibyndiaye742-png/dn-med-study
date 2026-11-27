"use client";
import * as THREE from "three";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Html, useGLTF } from "@react-three/drei";
import { MeshoptDecoder } from "meshoptimizer";

import {
  Search,
  Bone,
  Activity,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  X,
  Info,
  Scan,
  User,
  Layers,
  ChevronDown,
} from "lucide-react";

import {
  modelUrl,
  ANATOMY_BY_KEY,
  structuresFor,
  ATTRIBUTION,
} from "open-anatomy-3d";


const SYSTEMS = [
  { id: "skin", name: "Peau", color: "#e5a17b" },
  { id: "skeleton", name: "Squelette", color: "#f0dfb7" },
  { id: "muscles", name: "Muscles", color: "#d95c62" },
  { id: "organs", name: "Organes", color: "#d97945" },
  { id: "vessels", name: "Vaisseaux", color: "#d94b55" },
  { id: "nerves", name: "Nerfs", color: "#e8c34d" },
];

const INITIAL_SYSTEMS = [
  "skeleton",
  "muscles",
  "organs",
  "vessels",
  "nerves",
];

const getName = (info) => {
  if (!info) return "Structure anatomique";

  return (
    info.nameFr ||
    info.frenchName ||
    info.labelFr ||
    info.name ||
    info.label ||
    info.key ||
    "Structure anatomique"
  );
};

const getDescription = (info) => {
  if (!info) return "";

  return (
    info.descriptionFr ||
    info.frenchDescription ||
    info.description ||
    info.details ||
    ""
  );
};

const getSystemName = (system) => {
  return SYSTEMS.find((s) => s.id === system)?.name || system || "Anatomie";
};


/* =========================================================
   MODÈLE 3D
========================================================= */

function AnatomyModel({
  sex,
  visibleSystems,
  isolatedKey,
  selectedKey,
  onSelect,
  onHover,
}) {
  const url = modelUrl(sex);

  const { scene } = useGLTF(
    url,
    true,
    true,
    (loader) => {
      loader.setMeshoptDecoder(MeshoptDecoder);
    }
  );

  const model = useMemo(() => {
    const clonedScene = scene.clone(true);

    const box = new THREE.Box3().setFromObject(clonedScene);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();

    box.getCenter(center);
    box.getSize(size);

    const height = size.y || 1;

    // Ajustement automatique de la taille du corps.
    const scale = 3.25 / height;

    const position = [
      -center.x * scale,
      -center.y * scale,
      -center.z * scale,
    ];

    clonedScene.traverse((object) => {
      if (!object.isMesh) return;

      const info = ANATOMY_BY_KEY[object.name];

      // Les structures inconnues sont cachées.
      if (!info || !SYSTEMS.some((s) => s.id === info.system)) {
        object.visible = false;
        return;
      }

      object.userData.anatomyInfo = info;
      object.userData.anatomyKey = info.key || object.name;

      // Matériaux indépendants pour chaque structure.
      if (Array.isArray(object.material)) {
        object.material = object.material.map((material) =>
          material.clone()
        );
      } else if (object.material) {
        object.material = object.material.clone();
      }
    });

    return {
      scene: clonedScene,
      scale,
      position,
    };
  }, [scene]);

  useEffect(() => {
    model.scene.traverse((object) => {
      if (!object.isMesh) return;

      const info = object.userData.anatomyInfo;

      if (!info) {
        object.visible = false;
        return;
      }

      const systemVisible = visibleSystems.includes(info.system);

      const isolatedVisible =
        !isolatedKey ||
        object.userData.anatomyKey === isolatedKey;

      object.visible = systemVisible && isolatedVisible;

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      materials.forEach((material) => {
        if (!material) return;

        if (material.emissive) {
          if (object.userData.anatomyKey === selectedKey) {
            material.emissive.set("#3b82f6");
            material.emissiveIntensity = 0.65;
          } else {
            material.emissive.set("#000000");
            material.emissiveIntensity = 0;
          }
        }

        material.needsUpdate = true;
      });
    });
  }, [model, visibleSystems, isolatedKey, selectedKey]);

  return (
    <group
      scale={model.scale}
      position={model.position}
    >
      <primitive object={model.scene} />

      {/*
        Les clics sont traités directement sur les meshes
        par le gestionnaire de sélection du modèle.
      */}
      <SelectionHandler
        scene={model.scene}
        onSelect={onSelect}
        onHover={onHover}
      />
    </group>
  );
}


/* =========================================================
   GESTION DE LA SÉLECTION DIRECTE
========================================================= */

function SelectionHandler({ scene, onSelect, onHover }) {
  useEffect(() => {
    scene.traverse((object) => {
      if (!object.isMesh) return;

      const info = object.userData.anatomyInfo;

      if (!info) return;

      object.userData.selectStructure = () => {
        onSelect(info, object);
      };
    });
  }, [scene, onSelect]);

  return null;
}


/* =========================================================
   CONTRÔLE DU ZOOM SUR UNE STRUCTURE
========================================================= */

function CameraFocus({ selectedObject, controlsRef }) {
  const { camera } = useThree();

  useEffect(() => {
    if (!selectedObject) return;

    selectedObject.updateWorldMatrix(true, true);

    const box = new THREE.Box3().setFromObject(selectedObject);

    if (box.isEmpty()) return;

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();

    box.getCenter(center);
    box.getSize(size);

    const maxSize = Math.max(size.x, size.y, size.z);

    const distance = Math.max(0.65, maxSize * 2.5);

    const direction = camera.position.clone().sub(
      controlsRef.current?.target || new THREE.Vector3(0, 0, 0)
    );

    if (direction.length() === 0) {
      direction.set(0, 0, 1);
    }

    direction.normalize();

    camera.position.copy(
      center.clone().add(direction.multiplyScalar(distance))
    );

    camera.near = 0.01;
    camera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
  }, [selectedObject, camera, controlsRef]);

  return null;
}


/* =========================================================
   SCÈNE 3D
========================================================= */

function AnatomyCanvas({
  sex,
  visibleSystems,
  isolatedKey,
  selectedKey,
  selectedObject,
  onSelect,
  controlsRef,
}) {
  return (
    <Canvas
      camera={{
        position: [0, 0, 6.8],
        fov: 38,
        near: 0.01,
        far: 100,
      }}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: true,
      }}
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <ambientLight intensity={1.1} />

      <directionalLight
        position={[4, 5, 5]}
        intensity={2}
      />

      <directionalLight
        position={[-4, 2, -3]}
        intensity={1}
      />

      <Suspense
        fallback={
          <Html center>
            <div style={{ color: "#2563eb", fontWeight: 600 }}>
              Chargement du modèle anatomique...
            </div>
          </Html>
        }
      >
        <AnatomyModel
          sex={sex}
          visibleSystems={visibleSystems}
          isolatedKey={isolatedKey}
          selectedKey={selectedKey}
          onSelect={onSelect}
        />
      </Suspense>

      <CameraFocus
        selectedObject={selectedObject}
        controlsRef={controlsRef}
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan
        enableZoom
        minDistance={0.35}
        maxDistance={14}
        target={[0, 0, 0]}
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
      />
    </Canvas>
  );
}


/* =========================================================
   PAGE PRINCIPALE
========================================================= */

export default function Anatomie3D() {
  const [sex, setSex] = useState("male");

  const [visibleSystems, setVisibleSystems] =
    useState(INITIAL_SYSTEMS);

  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);

  const [isolatedKey, setIsolatedKey] = useState(null);

  const [showSystems, setShowSystems] = useState(true);

  const controlsRef = useRef(null);

  const catalog = useMemo(() => {
    return structuresFor(sex) || [];
  }, [sex]);

  const filteredStructures = useMemo(() => {
    if (!search.trim()) return [];

    const term = search.toLowerCase();

    return catalog.filter((item) => {
      const name = getName(item).toLowerCase();

      const key = String(item.key || "").toLowerCase();

      const latin = String(
        item.latinName || item.latin || ""
      ).toLowerCase();

      return (
        name.includes(term) ||
        key.includes(term) ||
        latin.includes(term)
      );
    }).slice(0, 30);
  }, [catalog, search]);

  const selectStructure = useCallback((info, object = null) => {
    if (!info) return;

    setSelected(info);
    setSelectedObject(object);
    setIsolatedKey(null);

    // Active automatiquement le système de la structure.
    if (info.system) {
      setVisibleSystems((previous) => {
        if (previous.includes(info.system)) return previous;

        return [...previous, info.system];
      });
    }
  }, []);

  const selectFromSearch = (info) => {
    const structure = ANATOMY_BY_KEY[info.key];

    setSelected(info);
    setSelectedObject(null);
    setIsolatedKey(null);

    if (info.system) {
      setVisibleSystems((previous) => {
        if (previous.includes(info.system)) return previous;

        return [...previous, info.system];
      });
    }

    setSearch("");
  };

  const toggleSystem = (systemId) => {
    setVisibleSystems((previous) => {
      if (previous.includes(systemId)) {
        return previous.filter((id) => id !== systemId);
      }

      return [...previous, systemId];
    });

    setIsolatedKey(null);
  };

  const showAllSystems = () => {
    setVisibleSystems(SYSTEMS.map((s) => s.id));
    setIsolatedKey(null);
  };

  const hideAllSystems = () => {
    setVisibleSystems([]);
    setIsolatedKey(null);
    setSelected(null);
    setSelectedObject(null);
  };

  const isolateSelected = () => {
    if (!selected) return;

    setVisibleSystems((previous) => {
      if (previous.includes(selected.system)) return previous;

      return [...previous, selected.system];
    });

    setIsolatedKey(selected.key);
  };

  const showAllAfterIsolation = () => {
    setIsolatedKey(null);
  };

  const changeSex = (value) => {
    setSex(value);
    setSelected(null);
    setSelectedObject(null);
    setIsolatedKey(null);
  };

  const zoomIn = () => {
    if (!controlsRef.current) return;

    const camera = controlsRef.current.object;

    camera.position.multiplyScalar(0.8);
    controlsRef.current.update();
  };

  const zoomOut = () => {
    if (!controlsRef.current) return;

    const camera = controlsRef.current.object;

    camera.position.multiplyScalar(1.2);
    controlsRef.current.update();
  };

  return (
    <div className="anatomy-page">

      <style jsx global>{`
        .anatomy-page {
          min-height: 100vh;
          background: #f4f7fb;
          color: #172b45;
          padding: 16px;
          font-family: Arial, sans-serif;
        }

        .anatomy-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .anatomy-title {
          font-size: 23px;
          font-weight: 800;
          color: #10243a;
        }

        .anatomy-subtitle {
          color: #718096;
          font-size: 13px;
          margin-top: 4px;
        }

        .anatomy-card {
          background: white;
          border: 1px solid #e5eaf1;
          border-radius: 15px;
          box-shadow: 0 4px 16px rgba(20, 40, 70, 0.04);
        }

        .anatomy-toolbar {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 12px;
        }

        .anatomy-button {
          border: 1px solid #e0e7f0;
          background: white;
          color: #334155;
          padding: 9px 12px;
          border-radius: 9px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 600;
        }

        .anatomy-button:hover {
          background: #eff6ff;
          border-color: #93c5fd;
        }

        .anatomy-button.active {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
        }

        .anatomy-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 290px;
          gap: 14px;
          align-items: stretch;
        }

        .anatomy-viewer {
          height: 650px;
          min-height: 480px;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at center, #ffffff 0%, #f0f5fb 75%);
          border-radius: 15px;
        }

        .anatomy-side {
          padding: 16px;
          min-width: 0;
        }

        .anatomy-section-title {
          font-weight: 800;
          font-size: 15px;
          margin-bottom: 12px;
          color: #172b45;
        }

        .anatomy-search {
          width: 100%;
          padding: 12px;
          border: 1px solid #dbe4ef;
          border-radius: 10px;
          outline: none;
          font-size: 13px;
          background: white;
          color: #172b45;
        }

        .anatomy-search:focus {
          border-color: #3b82f6;
        }

        .anatomy-search-results {
          position: absolute;
          top: 45px;
          left: 0;
          right: 0;
          z-index: 20;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          max-height: 260px;
          overflow-y: auto;
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        }

        .anatomy-result {
          width: 100%;
          border: none;
          background: white;
          text-align: left;
          padding: 11px;
          cursor: pointer;
          color: #334155;
          border-bottom: 1px solid #f1f5f9;
          font-size: 13px;
        }

        .anatomy-result:hover {
          background: #eff6ff;
        }

        .anatomy-system {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 11px;
          border-radius: 9px;
          border: 1px solid #e5eaf1;
          background: white;
          margin-bottom: 7px;
          cursor: pointer;
          color: #334155;
          font-size: 13px;
          font-weight: 600;
        }

        .anatomy-system.active {
          background: #eff6ff;
          border-color: #93c5fd;
          color: #1d4ed8;
        }

        .anatomy-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 8px;
        }

        .anatomy-info-box {
          background: #f8fafc;
          border: 1px solid #e5eaf1;
          padding: 14px;
          border-radius: 12px;
          margin-top: 12px;
        }

        .anatomy-info-name {
          font-size: 17px;
          font-weight: 800;
          color: #10243a;
          margin-bottom: 8px;
        }

        .anatomy-info-text {
          font-size: 13px;
          color: #64748b;
          line-height: 1.6;
        }

        .anatomy-floating {
          position: absolute;
          z-index: 10;
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
        }

        .anatomy-floating.top {
          top: 12px;
          left: 12px;
          right: 12px;
        }

        .anatomy-floating.bottom {
          bottom: 14px;
          right: 14px;
        }

        .anatomy-floating button {
          background: white;
          border: 1px solid #dbe4ef;
          padding: 9px;
          border-radius: 9px;
          cursor: pointer;
          color: #334155;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }

        .anatomy-floating button:hover {
          background: #eff6ff;
        }

        .anatomy-label {
          background: #10243a;
          color: white;
          padding: 7px 11px;
          border-radius: 8px;
          font-size: 12px;
          white-space: nowrap;
        }

        @media (max-width: 850px) {
          .anatomy-layout {
            grid-template-columns: 1fr;
          }

          .anatomy-viewer {
            height: 570px;
            min-height: 450px;
          }

          .anatomy-side {
            padding: 14px;
          }
        }

        @media (max-width: 480px) {
          .anatomy-page {
            padding: 9px;
          }

          .anatomy-title {
            font-size: 20px;
          }

          .anatomy-viewer {
            height: 510px;
            min-height: 430px;
          }

          .anatomy-button {
            padding: 8px 9px;
            font-size: 12px;
          }
        }
      `}</style>


      {/* EN-TÊTE */}

      <div className="anatomy-header">
        <div>
          <div className="anatomy-title">
            Anatomie 3D
          </div>

          <div className="anatomy-subtitle">
            Explore le corps humain et ses structures anatomiques.
          </div>
        </div>

        <div className="anatomy-toolbar">
          <button
            className={`anatomy-button ${sex === "male" ? "active" : ""}`}
            onClick={() => changeSex("male")}
          >
            <User size={16} />
            Homme
          </button>

          <button
            className={`anatomy-button ${sex === "female" ? "active" : ""}`}
            onClick={() => changeSex("female")}
          >
            <User size={16} />
            Femme
          </button>
        </div>
      </div>


      {/* RECHERCHE */}

      <div
        style={{
          position: "relative",
          marginBottom: 13,
          maxWidth: 550,
        }}
      >
        <Search
          size={17}
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            color: "#94a3b8",
          }}
        />

        <input
          className="anatomy-search"
          style={{ paddingLeft: 38 }}
          placeholder="Rechercher un muscle, un os, un organe..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {search.trim() !== "" && (
          <div className="anatomy-search-results">
            {filteredStructures.length > 0 ? (
              filteredStructures.map((item) => (
                <button
                  key={item.key}
                  className="anatomy-result"
                  onClick={() => selectFromSearch(item)}
                >
                  <strong>{getName(item)}</strong>

                  <div style={{ color: "#94a3b8", marginTop: 3 }}>
                    {getSystemName(item.system)}
                  </div>
                </button>
              ))
            ) : (
              <div style={{ padding: 13, fontSize: 13, color: "#64748b" }}>
                Aucune structure trouvée.
              </div>
            )}
          </div>
        )}
      </div>


      {/* CONTENU */}

      <div className="anatomy-layout">

        {/* VUE 3D */}

        <div className="anatomy-card anatomy-viewer">

          <AnatomyCanvas
            sex={sex}
            visibleSystems={visibleSystems}
            isolatedKey={isolatedKey}
            selectedKey={selected?.key}
            selectedObject={selectedObject}
            onSelect={selectStructure}
            controlsRef={controlsRef}
          />

          {/* COMMANDES */}

          <div className="anatomy-floating top">
            {isolatedKey && (
              <button
                onClick={showAllAfterIsolation}
                title="Afficher de nouveau les autres structures"
              >
                <Layers size={17} />
                Voir les autres
              </button>
            )}

            {selected && !isolatedKey && (
              <button
                onClick={isolateSelected}
                title="Isoler cette structure"
              >
                <Scan size={17} />
                Isoler
              </button>
            )}
          </div>

          <div className="anatomy-floating bottom">
            <button
              onClick={zoomIn}
              title="Zoom avant"
            >
              <ZoomIn size={19} />
            </button>

            <button
              onClick={zoomOut}
              title="Zoom arrière"
            >
              <ZoomOut size={19} />
            </button>
          </div>

          {selected && (
            <div
              style={{
                position: "absolute",
                bottom: 14,
                left: 14,
                zIndex: 5,
                maxWidth: "65%",
              }}
            >
              <div className="anatomy-label">
                {getName(selected)}
              </div>
            </div>
          )}

        </div>


        {/* PANNEAU LATÉRAL */}

        <div className="anatomy-card anatomy-side">

          <div className="anatomy-section-title">
            <Layers
              size={17}
              style={{ display: "inline", marginRight: 7 }}
            />
            Systèmes anatomiques
          </div>

          <div
            style={{
              display: "flex",
              gap: 7,
              marginBottom: 12,
            }}
          >
            <button
              className="anatomy-button"
              onClick={showAllSystems}
            >
              <Eye size={15} />
              Tout afficher
            </button>

            <button
              className="anatomy-button"
              onClick={hideAllSystems}
            >
              <EyeOff size={15} />
              Tout masquer
            </button>
          </div>

          {SYSTEMS.map((system) => {
            const active = visibleSystems.includes(system.id);

            return (
              <button
                key={system.id}
                className={`anatomy-system ${active ? "active" : ""}`}
                onClick={() => toggleSystem(system.id)}
              >
                <span>
                  <span
                    className="anatomy-dot"
                    style={{ background: system.color }}
                  />

                  {system.name}
                </span>

                {active ? (
                  <Eye size={16} />
                ) : (
                  <EyeOff size={16} />
                )}
              </button>
            );
          })}


          {/* INFORMATIONS */}

          <div className="anatomy-info-box">

            <div className="anatomy-section-title">
              <Info
                size={16}
                style={{ display: "inline", marginRight: 6 }}
              />
              Structure sélectionnée
            </div>

            {selected ? (
              <>
                <div className="anatomy-info-name">
                  {getName(selected)}
                </div>

                <div className="anatomy-info-text">
                  <strong>Système :</strong>{" "}
                  {getSystemName(selected.system)}
                </div>

                {selected.latinName && (
                  <div className="anatomy-info-text">
                    <strong>Nom latin :</strong>{" "}
                    {selected.latinName}
                  </div>
                )}

                {getDescription(selected) && (
                  <div
                    className="anatomy-info-text"
                    style={{ marginTop: 9 }}
                  >
                    {getDescription(selected)}
                  </div>
                )}

                <button
                  className="anatomy-button active"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    marginTop: 13,
                  }}
                  onClick={isolateSelected}
                >
                  <Scan size={16} />
                  Isoler cette structure
                </button>
              </>
            ) : (
              <div className="anatomy-info-text">
                Sélectionne directement un muscle, un os ou un organe
                dans le modèle 3D pour afficher ses informations.
                Tu pourras ensuite l'isoler et zoomer pour l'étudier.
              </div>
            )}

          </div>

          <div
            style={{
              fontSize: 11,
              color: "#94a3b8",
              lineHeight: 1.5,
              marginTop: 15,
            }}
          >
            {ATTRIBUTION}
          </div>

        </div>

      </div>
    </div>
  );
          }
