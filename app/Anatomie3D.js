"use client";

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import * as THREE from "three";

import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Html, useGLTF } from "@react-three/drei";
import { MeshoptDecoder } from "meshoptimizer";

import {
  User,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Info,
  Scan,
  Layers,
  X,
} from "lucide-react";

import {
  modelUrl,
  ANATOMY_BY_KEY,
  ATTRIBUTION,
} from "open-anatomy-3d";


/* =====================================================
   CONFIGURATION ANATOMIQUE
===================================================== */

const SYSTEMS = [
  { id: "skin", name: "Peau", color: "#e5a17b" },
  { id: "skeleton", name: "Squelette", color: "#e8d9b7" },
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

function getStructureName(info) {
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
}

function getStructureDescription(info) {
  if (!info) return "";

  return (
    info.descriptionFr ||
    info.frenchDescription ||
    info.description ||
    info.details ||
    ""
  );
}

function getSystemName(system) {
  return (
    SYSTEMS.find((item) => item.id === system)?.name ||
    system ||
    "Anatomie"
  );
}


/* =====================================================
   PRÉPARATION DU MODÈLE
===================================================== */

function AnatomyModel({
  sex,
  visibleSystems,
  isolatedKey,
  selectedKey,
  onSelect,
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

    // On conserve le cadrage vertical déjà corrigé.
    const scale = 3.25 / (size.y || 1);

    const position = [
      -center.x * scale,
      -center.y * scale,
      -center.z * scale,
    ];

    clonedScene.traverse((object) => {
      if (!object.isMesh) return;

      const info = ANATOMY_BY_KEY[object.name];

      // Masquer les meshes qui ne correspondent
      // à aucune structure du catalogue.
      if (!info || !SYSTEMS.some((s) => s.id === info.system)) {
        object.visible = false;
        return;
      }

      object.userData.anatomyInfo = info;
      object.userData.anatomyKey = info.key || object.name;

      // Les matériaux sont clonés pour préserver
      // les couleurs naturelles du modèle original.
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      const clonedMaterials = materials.map((material) => {
        const clone = material.clone();

        if (clone.emissive) {
          clone.userData.originalEmissive =
            clone.emissive.clone();

          clone.userData.originalEmissiveIntensity =
            clone.emissiveIntensity || 0;
        }

        return clone;
      });

      object.material = Array.isArray(object.material)
        ? clonedMaterials
        : clonedMaterials[0];
    });

    return {
      scene: clonedScene,
      scale,
      position,
    };
  }, [scene]);

  // Gestion de la visibilité et de la couleur sélectionnée.
  useEffect(() => {
    model.scene.traverse((object) => {
      if (!object.isMesh) return;

      const info = object.userData.anatomyInfo;

      if (!info) {
        object.visible = false;
        return;
      }

      const key = object.userData.anatomyKey;

      const systemVisible = visibleSystems.includes(info.system);

      const isolationVisible =
        !isolatedKey || key === isolatedKey;

      object.visible = systemVisible && isolationVisible;

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      materials.forEach((material) => {
        if (!material?.emissive) return;

        if (key === selectedKey) {
          // Mise en évidence uniquement de la structure touchée.
          material.emissive.set("#2684ff");
          material.emissiveIntensity = 0.85;
        } else {
          // Retour à la couleur originale.
          material.emissive.copy(
            material.userData.originalEmissive ||
              new THREE.Color("#000000")
          );

          material.emissiveIntensity =
            material.userData.originalEmissiveIntensity || 0;
        }

        material.needsUpdate = true;
      });
    });
  }, [model, visibleSystems, isolatedKey, selectedKey]);

  // IMPORTANT :
  // L'événement est attaché directement à la scène 3D.
  // Lorsqu'un mesh enfant est touché, event.object
  // désigne précisément ce mesh.
  const handleClick = useCallback(
    (event) => {
      event.stopPropagation();

      const object = event.object;

      if (!object || !object.isMesh) return;

      const info = object.userData.anatomyInfo;

      if (!info) return;

      const key = object.userData.anatomyKey;

      onSelect(info, object, key);
    },
    [onSelect]
  );

  return (
    <group
      scale={model.scale}
      position={model.position}
    >
      <primitive
        object={model.scene}
        onClick={handleClick}
      />
    </group>
  );
}


/* =====================================================
   CAMÉRA : CENTRAGE SUR LA STRUCTURE SÉLECTIONNÉE
===================================================== */

function CameraFocus({
  selectedObject,
  controlsRef,
  focusVersion,
}) {
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

    const distance = Math.max(0.65, maxSize * 2.8);

    const direction = camera.position.clone().sub(
      controlsRef.current?.target ||
        new THREE.Vector3(0, 0, 0)
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
  }, [selectedObject, camera, controlsRef, focusVersion]);

  return null;
}


/* =====================================================
   SCÈNE 3D
===================================================== */

function AnatomyCanvas({
  sex,
  visibleSystems,
  isolatedKey,
  selectedKey,
  selectedObject,
  onSelect,
  controlsRef,
  focusVersion,
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
        touchAction: "none",
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
        focusVersion={focusVersion}
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        enablePan
        enableZoom
        minDistance={0.25}
        maxDistance={14}
        target={[0, 0, 0]}
        minPolarAngle={0}
        maxPolarAngle={Math.PI}
      />
    </Canvas>
  );
}


/* =====================================================
   PAGE ANATOMIE 3D
===================================================== */

export default function Anatomie3D() {
  const [sex, setSex] = useState("male");

  const [visibleSystems, setVisibleSystems] =
    useState(INITIAL_SYSTEMS);

  const [selected, setSelected] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);

  const [isolatedKey, setIsolatedKey] = useState(null);

  const [focusVersion, setFocusVersion] = useState(0);

  const controlsRef = useRef(null);


  /* Sélection directe sur le modèle 3D */

  const selectStructure = useCallback(
    (info, object, key) => {
      if (!info || !object || !key) return;

      setSelected(info);
      setSelectedObject(object);
      setSelectedKey(key);
      setIsolatedKey(null);

      // Active automatiquement la couche de la structure.
      if (info.system) {
        setVisibleSystems((previous) => {
          if (previous.includes(info.system)) {
            return previous;
          }

          return [...previous, info.system];
        });
      }

      // Recentre la caméra sur la structure touchée.
      setFocusVersion((version) => version + 1);
    },
    []
  );


  /* Afficher ou masquer un système */

  const toggleSystem = (systemId) => {
    const willHide = visibleSystems.includes(systemId);

    setVisibleSystems((previous) => {
      if (previous.includes(systemId)) {
        return previous.filter((id) => id !== systemId);
      }

      return [...previous, systemId];
    });

    setIsolatedKey(null);

    if (willHide && selected?.system === systemId) {
      setSelected(null);
      setSelectedObject(null);
      setSelectedKey(null);
    }
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
    setSelectedKey(null);
  };


  /* Isoler une structure */

  const isolateSelected = () => {
    if (!selected || !selectedKey) return;

    setVisibleSystems((previous) => {
      if (previous.includes(selected.system)) {
        return previous;
      }

      return [...previous, selected.system];
    });

    setIsolatedKey(selectedKey);
  };


  const showOtherStructures = () => {
    setIsolatedKey(null);
  };


  /* Changer de modèle */

  const changeSex = (value) => {
    setSex(value);
    setSelected(null);
    setSelectedObject(null);
    setSelectedKey(null);
    setIsolatedKey(null);
  };


  /* Zoom */

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


  const focusAgain = () => {
    if (!selectedObject) return;

    setFocusVersion((version) => version + 1);
  };


  const closeSelection = () => {
    setSelected(null);
    setSelectedObject(null);
    setSelectedKey(null);
    setIsolatedKey(null);
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
          box-shadow: 0 4px 16px rgba(20,40,70,0.04);
        }

        .anatomy-toolbar {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .anatomy-button {
          border: 1px solid #e0e7f0;
          background: white;
          color: #334155;
          padding: 10px 12px;
          min-height: 42px;
          border-radius: 9px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 600;
          touch-action: manipulation;
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
          grid-template-columns: minmax(0,1fr) 290px;
          gap: 14px;
          align-items: stretch;
        }

        .anatomy-viewer {
          height: 650px;
          min-height: 480px;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at center,#ffffff 0%,#f0f5fb 75%);
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

        .anatomy-system {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 11px;
          min-height: 44px;
          border-radius: 9px;
          border: 1px solid #e5eaf1;
          background: white;
          margin-bottom: 7px;
          cursor: pointer;
          color: #334155;
          font-size: 13px;
          font-weight: 600;
          touch-action: manipulation;
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
          margin-top: 14px;
        }

        .anatomy-info-name {
          font-size: 18px;
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
          min-width: 44px;
          min-height: 44px;
          padding: 9px;
          border-radius: 9px;
          cursor: pointer;
          color: #334155;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          touch-action: manipulation;
        }

        .anatomy-label {
          background: #10243a;
          color: white;
          padding: 9px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
        }

        @media (max-width:850px) {
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

        @media (max-width:480px) {
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
            Explore et étudie les structures du corps humain.
          </div>
        </div>

        <div className="anatomy-toolbar">

          <button
            className={`anatomy-button ${
              sex === "male" ? "active" : ""
            }`}
            onClick={() => changeSex("male")}
          >
            <User size={16} />
            Homme
          </button>

          <button
            className={`anatomy-button ${
              sex === "female" ? "active" : ""
            }`}
            onClick={() => changeSex("female")}
          >
            <User size={16} />
            Femme
          </button>

        </div>

      </div>


      {/* MODÈLE ET PANNEAU */}

      <div className="anatomy-layout">

        {/* CORPS 3D */}

        <div className="anatomy-card anatomy-viewer">

          <AnatomyCanvas
            sex={sex}
            visibleSystems={visibleSystems}
            isolatedKey={isolatedKey}
            selectedKey={selectedKey}
            selectedObject={selectedObject}
            onSelect={selectStructure}
            controlsRef={controlsRef}
            focusVersion={focusVersion}
          />


          {/* COMMANDES DE SÉLECTION */}

          <div className="anatomy-floating top">

            {selected && (
              <>
                {!isolatedKey ? (
                  <button
                    onClick={isolateSelected}
                    title="Isoler la structure sélectionnée"
                  >
                    <Scan size={17} />
                    Isoler
                  </button>
                ) : (
                  <button
                    onClick={showOtherStructures}
                    title="Afficher les autres structures"
                  >
                    <Layers size={17} />
                    Tout revoir
                  </button>
                )}

                <button
                  onClick={focusAgain}
                  title="Recentrer la caméra"
                >
                  <Scan size={17} />
                  Centrer
                </button>

                <button
                  onClick={closeSelection}
                  title="Fermer la sélection"
                >
                  <X size={17} />
                </button>
              </>
            )}

          </div>


          {/* ZOOM */}

          <div className="anatomy-floating bottom">

            <button
              onClick={zoomIn}
              title="Zoom avant"
            >
              <ZoomIn size={20} />
            </button>

            <button
              onClick={zoomOut}
              title="Zoom arrière"
            >
              <ZoomOut size={20} />
            </button>

          </div>


          {/* NOM DE LA STRUCTURE */}

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
                {getStructureName(selected)}
              </div>
            </div>
          )}

        </div>


        {/* PANNEAU LATÉRAL */}

        <div className="anatomy-card anatomy-side">

          <div className="anatomy-section-title">
            <Layers
              size={17}
              style={{
                display: "inline",
                marginRight: 7,
              }}
            />
            Systèmes anatomiques
          </div>


          {/* COMMANDES DES COUCHES */}

          <div
            style={{
              display: "flex",
              gap: 7,
              flexWrap: "wrap",
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


          {/* SYSTÈMES */}

          {SYSTEMS.map((system) => {
            const active = visibleSystems.includes(system.id);

            return (
              <button
                key={system.id}
                className={`anatomy-system ${
                  active ? "active" : ""
                }`}
                onClick={() => toggleSystem(system.id)}
              >
                <span>
                  <span
                    className="anatomy-dot"
                    style={{
                      background: system.color,
                    }}
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


          {/* INFORMATIONS ANATOMIQUES */}

          <div className="anatomy-info-box">

            <div className="anatomy-section-title">
              <Info
                size={16}
                style={{
                  display: "inline",
                  marginRight: 6,
                }}
              />
              Informations anatomiques
            </div>

            {selected ? (

              <>
                <div className="anatomy-info-name">
                  {getStructureName(selected)}
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

                {getStructureDescription(selected) && (
                  <div
                    className="anatomy-info-text"
                    style={{ marginTop: 10 }}
                  >
                    {getStructureDescription(selected)}
                  </div>
                )}

                <button
                  className="anatomy-button active"
                  style={{
                    width: "100%",
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
                <strong>Aucune structure sélectionnée.</strong>

                <p style={{ marginTop: 8 }}>
                  Touche directement un muscle, un os ou un organe
                  sur le corps 3D.
                </p>

                <p>
                  Son nom et les informations disponibles
                  apparaîtront ici. Tu pourras ensuite l'isoler,
                  zoomer dessus et tourner autour pour l'étudier.
                </p>
              </div>

            )}

          </div>


          {/* ATTRIBUTION */}

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
