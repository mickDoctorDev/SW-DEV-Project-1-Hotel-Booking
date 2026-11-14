// Hotels have no photo field in the API, so pick a stable Unsplash photo from the hotel name.
export const unsplash = (id, w) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`

const HOTEL_IDS = [
  '1566073771259-6a8506099945', '1542314831-068cd1dbfeeb', '1551882547-ff40c63fe5fa',
  '1520250497591-112f2f40a3f4', '1571896349842-33c89424de2d', '1445019980597-93fa8acb246c',
]

export const roomImage = unsplash('1578683010236-d716f9a3f461', 1600)

export const hotelImage = (hotel, w = 900) => {
  const sum = [...hotel.name].reduce((a, c) => a + c.charCodeAt(0), 0)
  return unsplash(HOTEL_IDS[sum % HOTEL_IDS.length], w)
}
