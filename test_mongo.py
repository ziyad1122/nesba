import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def test():
    client = AsyncIOMotorClient('mongodb+srv://zecc2:OcHtOPnuItwyMl48@cluster0.xbp8hoz.mongodb.net/?appName=Cluster0')
    info = await client.server_info()
    print('Connected:', info['version'])

asyncio.run(test())
