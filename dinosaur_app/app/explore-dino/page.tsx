"use client";

import React, { useContext, useEffect, useState } from "react";
import { DinoDataType } from "../lib/definitions";
import Dinocard from "./ui/Dinocard";

import {
  getAllDinousars,
  getDinoDietsforFilter,
  getDinoLengthsforFilter,
  getDinoWeightsforFilter,
} from "../lib/utils";

import SearchBar from "./ui/SearchBar";
import Filter from "./ui/Filter";

import RemoveFilter from "./ui/RemoveFilter";
import { getDinoLocationsforFilter } from "../lib/utils";
import PageLoading from "../ui/PageLoading";
import { AppContext } from "../ui/AppContext";

const ExploreDino = ({
  searchParams,
}: {
  searchParams?: {
    name: string;
    foundIn: string;
    diet: string;
    length: string;
    weight: string;
    decade?: string;
  };
}) => {
  const [dinausors, setDinousars] = useState<DinoDataType[]>([]);
  const [loading, setLoading] = useState(false);
  const name = searchParams?.name ?? "";
  const foundIn = searchParams?.foundIn ?? "";
  const diet = searchParams?.diet ?? "";
  const length = searchParams?.length ?? "";
  const weight = searchParams?.weight ?? "";
  const decade = searchParams?.decade ?? "";
  const { setRefreshSearchHistoryView } = useContext(AppContext);

  useEffect(() => {
    const fetchDinosaurs = async () => {
      setLoading(true);
      try {
        const currentURL = window.location.href;
        const dinausors = await getAllDinousars({
          name,
          foundIn,
          diet,
          length,
          weight,
          decade,
          currentURL,
        });

        setDinousars(dinausors);
        setRefreshSearchHistoryView(true);
      } catch (error) {
        console.log("Failed to fetch dinausors: ", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDinosaurs();
  }, [name, foundIn, diet, length, weight, decade]);

  return (
    <main className="flex flex-col  justify-center items-center pt-4 gap-y-8">
      <div className="flex flex-col items-center justify-center lg:flex-row gap-x-4">
        <SearchBar />
        <div className="grid grid-cols-2 gap-y-2 mt-4  md:flex gap-x-2 lg:mt-0 ">
          {
            <Filter
              placeholder="Countries"
              filterOptions={getDinoLocationsforFilter}
              paramValue="foundIn"
            />
          }
          <Filter
            placeholder="Diet"
            filterOptions={getDinoDietsforFilter}
            paramValue="diet"
          />
          <Filter
            placeholder="Length in (M)"
            filterOptions={getDinoLengthsforFilter}
            paramValue="length"
          />
          <Filter
            placeholder="Weight in (kg)"
            filterOptions={getDinoWeightsforFilter}
            paramValue="weight"
          />
        </div>
        <div className="max-lg:mt-2 max-lg:self-start max-lg:pl-2">
          <RemoveFilter />
        </div>
      </div>
      <div className="text-orange-600 text-2xl lg:self-start lg:pl-[6rem]">
        {loading ? (
          "Discovering..."
        ) : (
          <>
            {" "}
            Discovered
            <span className="font-extrabold mx-2">{dinausors?.length}</span>
            Dinosaurs
          </>
        )}
      </div>
      <div
        className={
          loading
            ? "flex justify-center items-center min-h-screen"
            : `grid  grid-flow-row md:grid-cols-2 md:gap-x-6 xl:grid-cols-3  gap-y-6 lg:gap-x-8`
        }
      >
        {loading ? (
          <PageLoading />
        ) : name.length > 0 && dinausors.length === 0 ? (
          <div className="text-3xl font-bold text-orange-600 text-center">
            No Dinosours found
          </div>
        ) : (
          dinausors?.map((dino) => {
            return (
              <Dinocard
                key={dino.id}
                id={dino.id}
                name={dino.name}
                location={dino.foundIn}
                imageSrc={dino.imageSrc}
                description={dino.description}
              />
            );
          })
        )}
      </div>
    </main>
  );
};

export default ExploreDino;
