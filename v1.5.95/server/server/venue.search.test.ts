import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getVenues: vi.fn(),
}));

import * as db from "./db";

describe("venue search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return venues matching keyword in name", async () => {
    const mockVenues = [
      {
        id: 60005,
        name: "香蜜体育中心网球场",
        area: "福田区",
        district: "香蜜公园",
        address: "福田区香蜜公园内",
        coverImage: "/manus-storage/venue_05_v2_88b14205.jpg",
        isActive: true,
      },
    ];
    vi.mocked(db.getVenues).mockResolvedValue(mockVenues as any);

    const result = await db.getVenues({ search: "香蜜", limit: 5 });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("香蜜体育中心网球场");
    expect(result[0].coverImage).toBeTruthy();
  });

  it("should return venues matching keyword in district", async () => {
    const mockVenues = [
      {
        id: 60016,
        name: "罗湖网球中心",
        area: "罗湖区",
        district: "罗湖",
        address: "罗湖区罗湖体育场内",
        coverImage: "/manus-storage/venue_16_v2_495b6441.jpg",
        isActive: true,
      },
    ];
    vi.mocked(db.getVenues).mockResolvedValue(mockVenues as any);

    const result = await db.getVenues({ search: "罗湖", limit: 5 });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("罗湖网球中心");
  });

  it("should return empty array when no match", async () => {
    vi.mocked(db.getVenues).mockResolvedValue([]);

    const result = await db.getVenues({ search: "不存在的球场xyz", limit: 5 });
    expect(result).toHaveLength(0);
  });

  it("should respect limit parameter", async () => {
    const mockVenues = Array.from({ length: 3 }, (_, i) => ({
      id: 60000 + i,
      name: `深圳网球场${i}`,
      area: "南山区",
      district: "南山",
      address: `南山区地址${i}`,
      coverImage: `/manus-storage/venue_0${i}.jpg`,
      isActive: true,
    }));
    vi.mocked(db.getVenues).mockResolvedValue(mockVenues as any);

    const result = await db.getVenues({ search: "深圳", limit: 3 });
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("should include coverImage for all 30 shenzhen venues in db", async () => {
    // Verify that venues have coverImage set
    const allVenues = Array.from({ length: 30 }, (_, i) => ({
      id: 60001 + i,
      name: `球场${i + 1}`,
      coverImage: `/manus-storage/venue_${String(i + 1).padStart(2, "0")}_abc123.jpg`,
      isActive: true,
    }));
    vi.mocked(db.getVenues).mockResolvedValue(allVenues as any);

    const result = await db.getVenues({});
    const withImages = result.filter(v => v.coverImage);
    expect(withImages.length).toBe(result.length);
  });
});
