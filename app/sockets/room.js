const Room = require("../models/room");
const User = require("../models/user");

function roomSocket(socket, io) {
  socket.on("change room info", async (msg, cb) => {
    try {
      if (!msg.error) {
        const {
          decoded: {
            _id: userId,
          },
          ownerId,
          data: roomObj,
          data: {
            _id: roomId,
          },
        } = msg;
        if (ownerId === userId) {
          const room = await Room.findById(roomId);
          Object.assign(room, roomObj);
          await room.save();
          const newRoom = await Room.findById(roomId).populate([
            {
              path: "owner",
              select: {
                password: 0,
              },
            },
            {
              path: "members",
              select: {
                password: 0,
              },
            },
          ]);
          io.to(roomId).emit("change room msg", newRoom);
          cb({
            status: 0,
            msg: "修改成功",
          });
        }
      } else {
        cb({
          status: 2,
          msg: "发送失败",
          error: "token错误",
        });
      }
    } catch (error) {
      cb({
        status: 3,
        msg: "发送失败",
        error: "服务器遇到点问题！",
      });
    }
  });

  socket.on("create room", async (msg, cb) => {
    try {
      if (!msg.eror) {
        const {
          decoded: {
            _id: userId,
          },
          data,
          data: { name },
        } = msg;
        const roomByName = await Room.findOne({ name });
        if (roomByName) {
          cb({
            status: 1,
            msg: "用户名已存在",
          });
        } else {
          const roomObj = Object.assign({}, data, {
            owner: userId,
            members: [userId],
          });
          const _room = new Room(roomObj);
          const { _id: roomId } = await _room.save();
          socket.join(roomId);
          await User.findByIdAndUpdate(userId, { $push: { joinedRooms: roomId } });
          const newRoom = await Room.findById(roomId).populate([
            {
              path: "owner",
              select: {
                password: 0,
              },
            },
            {
              path: "members",
              select: {
                password: 0,
              },
            },
          ]);
          cb({
            status: 0,
            data: newRoom,
          });
        }
      } else {
        cb({
          status: 2,
          msg: "发送失败",
          error: "token错误",
        });
      }
    } catch (error) {
      cb({
        status: 3,
        msg: "发送失败",
        error: "服务器遇到点问题！",
      });
    }
  });

  socket.on("search rooms", async (msg, cb) => {
    try {
      if (!msg.eror) {
        const {
          data: {
            name,
          },
        } = msg;
        const rooms = await Room.find({ name: new RegExp(name, "i") }).populate([
          {
            path: "owner",
            select: {
              password: 0,
            },
          },
          {
            path: "members",
            select: {
              password: 0,
            },
          },
        ]);
        cb({
          status: 0,
          data: rooms,
        });
      } else {
        cb({
          status: 2,
          msg: "发送失败",
          error: "token错误",
        });
      }
    } catch (error) {
      cb({
        status: 3,
        msg: "发送失败",
        error: "服务器遇到点问题！",
      });
    }
  });

  socket.on("add room member", async (msg, cb) => {
    try {
      if (!msg.error) {
        const {
          decoded: {
            _id: userId,
          },
          data: {
            roomId,
          },
        } = msg;
        const user = await User.findByIdAndUpdate(userId, {
          $push: {
            joinedRooms: roomId,
          },
        }, {
          new: true,
          fields: {
            password: 0,
          },
        });
        await Room.findByIdAndUpdate(roomId, { $push: { members: userId } });
        socket.join(roomId);
        socket.broadcast.to(roomId).emit("add room member", {
          roomId,
          user,
        });
        cb({
          status: 0,
          data: {
            roomId,
            user,
          },
        });
      } else {
        cb({
          status: 2,
          msg: "发送失败",
          error: "token错误",
        });
      }
    } catch (error) {
      cb({
        status: 3,
        msg: "发送失败",
        error: "服务器遇到点问题！",
      });
    }
  });

  socket.on("remove room", async (msg, cb) => {
    try {
      if (!msg.error) {
        const {
          data: {
            roomId,
          },
          decoded: {
            _id,
          },
        } = msg;
        const {
          owner,
          members,
        } = await Room.findById(roomId);
        if (owner.toString() === _id) {
          await Room.findByIdAndRemove(roomId);
          await User.update({ _id: { $in: members } }, { $pull: { members: roomId } }, { multi: true });
          io.to(roomId).emit("remove room", {
            data: {
              roomId,
            },
          });
          cb({
            status: 0,
            msg: "操作成功",
          });
        }
      } else {
        cb({
          status: 2,
          msg: "发送失败",
          error: "token错误",
        });
      }
    } catch (error) {
      cb({
        status: 3,
        msg: "发送失败",
        error: "服务器遇到点问题！",
      });
    }
  });

  socket.on("leave room", async (msg, cb) => {
    try {
      if (!msg.error) {
        const {
          data: {
            roomId,
          },
          decoded: {
            _id: userId,
          },
        } = msg;
        await Room.findByIdAndUpdate(roomId, { $pull: { menbers: userId } });
        await User.findByIdAndUpdate(userId, { $pull: { joinedRooms: roomId } });
        io.to(roomId).emit("leave room", {
          data: {
            userId,
            roomId,
          },
        });
        cb({
          status: 0,
          msg: "操作成功",
        });
        socket.leave(roomId);
      } else {
        cb({
          status: 2,
          msg: "发送失败",
          error: "token错误",
        });
      }
    } catch (error) {
      cb({
        status: 3,
        msg: "发送失败",
        error: "服务器遇到点问题！",
      });
    }
  });
}

module.exports = roomSocket;
