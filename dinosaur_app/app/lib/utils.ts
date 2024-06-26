"use server";

import { unstable_noStore } from "next/cache";
import { ConvertedLocations, DinoDataType, geoLocation } from "./definitions";
import { auth } from "@/auth";
import { db } from "./database";

const getPastDate = (pastDays: number) => {
  const currentDate = new Date();
  const utcCurrentDate = new Date(
    currentDate.getUTCFullYear(),
    currentDate.getUTCMonth(),
    currentDate.getUTCDate()
  );
  const pastDate = new Date(
    utcCurrentDate.getTime() - pastDays * 24 * 60 * 60 * 1000
  );

  const year = pastDate.getUTCFullYear();
  const month = `${pastDate.getUTCMonth() + 1}`.padStart(2, "0"); // Month is zero-indexed
  const day = `${pastDate.getUTCDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// fetch latest news from news api
export const fetchLatestNews = async () => {
  try {
    const newsApiKey = process.env.NEWS_API_KEY;
    const fromDate = getPastDate(29); // Assuming getPastDate function provides past date

    const topics = [
      "dinosaur fossils discovery",
      "cretaceous dinosaurs",
      "dinosaur digging",
      "triassic dinosaurs",
      "Jurassic dinosaur",
    ];

    // Make promises for each topic
    const newsPromises = topics.map(async (topic) => {
      const url = `https://newsapi.org/v2/everything?q=${topic}&from=${fromDate}&sortBy=popularity&apiKey=${newsApiKey}&language=en`;
      const response = await fetch(url);

      if (response.status === 200) {
        const data = await response.json();
        return data.articles; // Return all articles for now
      } else {
        return []; // Return empty array if request fails
      }
    });

    // Wait for all promises to resolve or reject
    const allNewsData = await Promise.all(newsPromises);

    // Combine articles from all topics
    const combinedArticles = allNewsData.flat();

    // Filter articles with unique urlToImage & exclude "dinosaur" in title (stricter check)
    const uniqueArticles: any = [];
    const uniqueArticlesUrls = new Set();
    for (const article of combinedArticles) {
      // Check for valid title and exclude articles that don't contain "dinosaur" (case-insensitive)
      if (
        article.title &&
        !article.title.trim().toLowerCase().includes("dinosaur")
      ) {
        // Check if urlToImage starts with https://
        if (article.urlToImage && article.urlToImage.startsWith("https://")) {
          uniqueArticlesUrls.add(article.title?.toLowerCase()); // Add title for uniqueness
          uniqueArticles.push(article);
          // Limit to 30 unique articles
          if (uniqueArticles.length === 30) {
            break;
          }
        }
      }
    }

    return uniqueArticles;
  } catch (error) {
    console.log("Attempt to fetch news failed: ", error);
    return []; // Return empty array on error
  }
};

// Converts a Dino found-in location into a geoJSON coordinate compatible with mapbox
export const convertDinoLocations = async (
  locations: string
): Promise<geoLocation[]> => {
  try {
    const accessToken = process.env.MAPBOX_ACCESS_TOKEN;
    const locationsArray = locations.split(",").map((loc) => loc.trim());
    const coordinatesPromises = locationsArray.map(async (location) => {
      const geocodingAPI = `https://api.mapbox.com/geocoding/v5/mapbox.places/${location}.json?access_token=${accessToken}`;
      const response = await fetch(geocodingAPI);
      const data = await response.json();
      if (data.features.length > 0) {
        const coordinates = data.features[0].geometry.coordinates;
        return { [location]: coordinates };
      } else {
        return { [location]: [] }; // Handle location not found
      }
    });
    const geoLocations = await Promise.all(coordinatesPromises);
    return geoLocations;
  } catch (error) {
    console.log("Failed to convert location to geo Coordinates");
    return [];
  }
};

export const getAllDinousars = async ({
  name,
  foundIn,
  diet,
  length,
  weight,
  decade,
  currentURL,
}: {
  name?: string;
  foundIn?: string;
  diet?: string;
  length?: string;
  weight?: string;
  decade?: string;
  currentURL: string;
}) => {
  unstable_noStore();
  try {
    const url = "https://chinguapi.onrender.com/dinosaurs";
    const resp = await fetch(url);
    const dinosaurs: DinoDataType[] = await resp.json();
    let filteredDinos: DinoDataType[] = [];
    if (name) {
      filteredDinos = dinosaurs.filter((dino) =>
        dino.name.toLowerCase().startsWith(name.toLowerCase())
      );
    }
    if (foundIn) {
      if (filteredDinos.length > 0) {
        filteredDinos = filteredDinos.filter((dino) =>
          dino.foundIn.toLowerCase().includes(foundIn.toLowerCase())
        );
      } else {
        filteredDinos = dinosaurs.filter((dino) =>
          dino.foundIn.toLowerCase().includes(foundIn.toLowerCase())
        );
      }
    }
    if (diet) {
      if (filteredDinos.length > 0) {
        filteredDinos = filteredDinos.filter(
          (dino) => dino.diet.toLowerCase() === diet.toLowerCase()
        );
      } else {
        filteredDinos = dinosaurs.filter(
          (dino) => dino.diet.toLowerCase() === diet.toLowerCase()
        );
      }
    }
    if (length) {
      if (filteredDinos.length > 0) {
        filteredDinos = filteredDinos.filter(
          (dino) => dino.length.toString() === length
        );
      } else {
        filteredDinos = dinosaurs.filter(
          (dino) => dino.length.toString() === length
        );
      }
    }
    if (weight) {
      if (filteredDinos.length > 0) {
        filteredDinos = filteredDinos.filter(
          (dino) => dino.weight.toString() === weight
        );
      } else {
        filteredDinos = dinosaurs.filter(
          (dino) => dino.weight.toString() === weight
        );
      }
    }
    if (decade) {
      if (filteredDinos.length > 0) {
        filteredDinos = filteredDinos.filter(
          (dino) =>
            Number(
              dino.namedBy.split(" ").pop()?.split("(").pop()?.split(")")[0]
            ) >= Number(decade.slice(0, 4)) &&
            Number(
              dino.namedBy.split(" ").pop()?.split("(").pop()?.split(")")[0]
            ) <
              Number(decade.slice(0, 4)) + 10
        );
      } else {
        filteredDinos = dinosaurs.filter(
          (dino) =>
            Number(
              dino.namedBy.split(" ").pop()?.split("(").pop()?.split(")")[0]
            ) >= Number(decade.slice(0, 4)) &&
            Number(
              dino.namedBy.split(" ").pop()?.split("(").pop()?.split(")")[0]
            ) <
              Number(decade.slice(0, 4)) + 10
        );
      }
    }
    if (!name && !foundIn && !diet && !length && !weight && !decade) {
      return dinosaurs;
    }

    if (filteredDinos.length) {
      //save to db;
      const confirmed = await saveSearchResults(currentURL);

      if (confirmed) {
        return filteredDinos;
      }
    }
    return [];
  } catch (error) {
    console.log("Failed to fetch dinausors: ", error);
    return [];
  }
};

async function saveSearchResults(url: string) {
  // seek userid;
  try {
    const session = await auth();

    if (session?.user?.email) {
      const userData = await db.user.findUnique({
        where: {
          email: session.user.email,
        },
      });

      if (userData) {
        const userId = userData.id;

        // pack data for saving in db;
        const searchItem = {
          query: url,
          userId,
        };

        // save data to db;
        const confirmation = await db.searchHistory.create({
          data: {
            ...searchItem,
          },
        });

        if (confirmation) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.log("Failed to save search to DB: ", error);
    return false;
  }
}

export const fetchDinoData = async (): Promise<DinoDataType[] | null> => {
  try {
    const url = "https://chinguapi.onrender.com/dinosaurs";
    const response = await fetch(url);
    if (response.status === 200) {
      const data = await response.json();
      const processedData: DinoDataType[] = [];
      for (const element of data) {
        const locations = element.foundIn;
        const geoLocations = await convertDinoLocations(locations);
        processedData.push({ ...element, geoLocations });
      }

      return processedData;
    } else {
      return null;
    }
  } catch (error) {
    console.log("Failed to fetch dino data: ", error);
    return null;
  }
};

export const getDigSites = async (parameter?: DinoDataType[]) => {
  let dinoData = null;
  if (!parameter) {
    dinoData = await fetchDinoData();
  } else {
    dinoData = parameter;
  }

  const dataGroupedByLocation = new Map();
  dinoData?.forEach((dino) => {
    dino.geoLocations?.forEach((location: geoLocation[]) => {
      const locName: string = Object.keys(location)[0];
      const digSite = dataGroupedByLocation.get(locName);
      if (digSite) {
        digSite.count++;
      } else {
        const coordinates = Object.values(location)[0];
        dataGroupedByLocation.set(locName, {
          coordinates,
          count: 1,
        });
      }
    });
  });

  const locationNestedObj = Array.from(dataGroupedByLocation.entries()).map(
    ([country, data]) => ({
      [country]: data,
    })
  );
  // console.log(locationNestedObj);
  return locationNestedObj as ConvertedLocations[];
};

export const getDinoById = async (
  id: number
): Promise<DinoDataType | undefined> => {
  const url = "https://chinguapi.onrender.com/dinosaurs";
  const resp = await fetch(url);
  const dinoData: DinoDataType[] = await resp.json();
  return dinoData?.find((dino) => dino.id === Number(id));
};

export const getDinoLocationsforFilter = async (): Promise<string[]> => {
  const url = "https://chinguapi.onrender.com/dinosaurs";
  const resp = await fetch(url);
  const dinosaurs: DinoDataType[] = await resp.json();
  const locations = Array.from(
    new Set(
      Array.from(new Set(dinosaurs.map((dino) => dino.foundIn)))
        .map((loc) => loc.split(","))
        .flat()
        .map((loc) => loc.trim())
    )
  ).sort();

  return locations;
};

export const getDinoDietsforFilter = async (): Promise<string[]> => {
  const url = "https://chinguapi.onrender.com/dinosaurs";
  const resp = await fetch(url);
  const dinosaurs: DinoDataType[] = await resp.json();
  const diets = Array.from(new Set(dinosaurs.map((dino) => dino.diet))).sort();
  return diets;
};

export const getDinoLengthsforFilter = async (): Promise<number[]> => {
  const url = "https://chinguapi.onrender.com/dinosaurs";
  const resp = await fetch(url);
  const dinosaurs: DinoDataType[] = await resp.json();
  const lengths = Array.from(
    new Set(
      dinosaurs.map((dino) => {
        if (!isNaN(Number(dino.length))) {
          return Number(dino.length);
        }
      })
    )
  ).filter((length) => length !== undefined) as number[];

  return lengths.sort((a, b) => a - b);
};

export const getDinoWeightsforFilter = async (): Promise<number[]> => {
  const url = "https://chinguapi.onrender.com/dinosaurs";
  const resp = await fetch(url);
  const dinosaurs: DinoDataType[] = await resp.json();
  const weights = Array.from(
    new Set(
      dinosaurs.map((dino) => {
        if (!isNaN(Number(dino.weight))) {
          return Number(dino.weight);
        }
      })
    )
  ).filter((weight) => weight !== undefined) as number[];

  return weights.sort((a, b) => a - b);
};

export async function formatDate(dateString: any) {
  const options: any = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: true,
  };
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", options); // Replace '/' with ', '
}

export async function getDecadesFromData(dinosaurs: DinoDataType[]) {
  const publicationYears = dinosaurs.map((dinosaur) => {
    const namedByString = dinosaur.namedBy
      .split(" ")
      .pop()
      ?.split("(")
      .pop()
      ?.split(")")[0];
    if (namedByString) {
      return parseInt(namedByString);
    }
  });

  const uniqueDecades = new Set(
    publicationYears.map((year) => year && Math.floor(year / 10))
  );
  return Array.from(uniqueDecades).sort() as number[];
}

export async function getUserSearchHistory(email: string) {
  unstable_noStore();
  try {
    const result = await db.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!result?.id) {
      return null;
    }

    const id = result.id;

    const dbResult = await db.searchHistory.findMany({
      where: {
        userId: id,
      },
    });

    if (dbResult) {
      const uniqueSearchHistory = new Map();

      dbResult.forEach((obj) => {
        if (!uniqueSearchHistory.has(obj.query)) {
          uniqueSearchHistory.set(obj.query, obj.query);
        }
      });

      const uniqueArr: string[] = [];
      uniqueSearchHistory.forEach((value) => {
        uniqueArr.push(value);
      });

      if (uniqueArr.length) {
        return uniqueArr;
      } else return null;
    } else return null;
  } catch (error) {
    throw error;
  }
}

export async function deleteSearchHistory(reqData: {
  user_email: string;
  delete_all: boolean;
  specified_history?: string;
}) {
  try {
    if (reqData.delete_all) {
      const result = await db.user.findUnique({
        where: {
          email: reqData.user_email,
        },
      });

      if (!result) {
        throw new Error(
          `Failed to get user specified with email: ${reqData.user_email}`
        );
      }

      const user_id = result.id;

      const confirmation = await db.searchHistory.deleteMany({
        where: {
          userId: user_id,
        },
      });

      if (confirmation.count) {
        return true;
      } else {
        return false;
      }
    } else if (!reqData.delete_all && reqData.specified_history) {
      const result = await db.user.findUnique({
        where: {
          email: reqData.user_email,
        },
      });

      if (!result) {
        throw new Error(
          `Failed to get user specified with email: ${reqData.user_email}`
        );
      }

      const user_id = result.id;

      const confirmation = await db.searchHistory.deleteMany({
        where: {
          AND: [{ userId: user_id }, { query: reqData.specified_history }],
        },
      });

      if (confirmation.count) {
        return true;
      } else return false;
    }
  } catch (error) {
    console.log("Error Delete at search history: ", error);
    throw error;
  }
}
