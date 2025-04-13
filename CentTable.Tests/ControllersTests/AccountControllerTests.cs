using System;
using System.Threading.Tasks;
using Xunit;
using Moq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using CentTable.Controllers;
using CentTable.Models;
using CentTable.ViewModels;
using CentTable.Services;
using CentTable.Interfaces;

namespace CentTable.Tests.ControllersTests
{
    public class AccountControllerTests
    {
        private Mock<UserManager<ApplicationUser>> GetUserManagerMock()
        {
            var store = new Mock<IUserStore<ApplicationUser>>();
            return new Mock<UserManager<ApplicationUser>>(
                store.Object, null, null, null, null, null, null, null, null);
        }

        private Mock<SignInManager<ApplicationUser>> GetSignInManagerMock(UserManager<ApplicationUser> userManager)
        {
            var contextAccessor = new Mock<Microsoft.AspNetCore.Http.IHttpContextAccessor>();
            var userClaimsFactory = new Mock<IUserClaimsPrincipalFactory<ApplicationUser>>();
            return new Mock<SignInManager<ApplicationUser>>(
                userManager, contextAccessor.Object, userClaimsFactory.Object, null, null, null, null);
        }

        [Fact]
        public async Task Register_ReturnsOk_WhenRegistrationSuccessful()
        {
            var userManagerMock = GetUserManagerMock();
            var signInManagerMock = GetSignInManagerMock(userManagerMock.Object);
            var jwtGeneratorMock = new Mock<IJwtTokenGenerator>();

            var registerModel = new RegisterViewModel
            {
                Username = "testuser",
                Email = "test@example.com",
                FirstName = "Test",
                LastName = "User",
                DateOfBirth = DateTime.Parse("1990-01-01"),
                Password = "Password123!",
                ConfirmPassword = "Password123!"
            };

            userManagerMock.Setup(um => um.CreateAsync(It.IsAny<ApplicationUser>(), It.IsAny<string>()))
                .ReturnsAsync(IdentityResult.Success);
            userManagerMock.Setup(um => um.AddToRoleAsync(It.IsAny<ApplicationUser>(), "User"))
                .ReturnsAsync(IdentityResult.Success);
            jwtGeneratorMock.Setup(j => j.GenerateTokenAsync(It.IsAny<ApplicationUser>()))
                .ReturnsAsync("dummy_token");

            var controller = new AccountController(
                userManagerMock.Object,
                signInManagerMock.Object,
                jwtGeneratorMock.Object);

            var result = await controller.Register(registerModel);

            var okResult = Assert.IsType<OkObjectResult>(result);
            var value = okResult.Value;
            var tokenProp = value.GetType().GetProperty("token");
            Assert.NotNull(tokenProp);
            var token = tokenProp.GetValue(value)?.ToString();
            Assert.Equal("dummy_token", token);
        }

        [Fact]
        public async Task Register_ReturnsBadRequest_WhenModelStateIsInvalid()
        {
            var userManagerMock = GetUserManagerMock();
            var signInManagerMock = GetSignInManagerMock(userManagerMock.Object);
            var jwtGeneratorMock = new Mock<IJwtTokenGenerator>();

            var controller = new AccountController(
                userManagerMock.Object,
                signInManagerMock.Object,
                jwtGeneratorMock.Object);
            controller.ModelState.AddModelError("Error", "Invalid Model");

            var result = await controller.Register(new RegisterViewModel());

            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task Login_ReturnsOk_WhenLoginSuccessful()
        {
            var userManagerMock = GetUserManagerMock();
            var signInManagerMock = GetSignInManagerMock(userManagerMock.Object);
            var jwtGeneratorMock = new Mock<IJwtTokenGenerator>();

            var loginModel = new LoginViewModel
            {
                Username = "testuser",
                Password = "Password123!",
                RememberMe = false
            };

            var testUser = new ApplicationUser { Id = "user1", UserName = "testuser" };

            userManagerMock.Setup(um => um.FindByNameAsync("testuser"))
                .ReturnsAsync(testUser);
            signInManagerMock.Setup(sm => sm.CheckPasswordSignInAsync(testUser, loginModel.Password, false))
                .ReturnsAsync(Microsoft.AspNetCore.Identity.SignInResult.Success);
            jwtGeneratorMock.Setup(j => j.GenerateTokenAsync(testUser))
                .ReturnsAsync("dummy_token");

            var controller = new AccountController(
                userManagerMock.Object,
                signInManagerMock.Object,
                jwtGeneratorMock.Object);

            var result = await controller.Login(loginModel);

            var okResult = Assert.IsType<OkObjectResult>(result);
            var value = okResult.Value;
            var tokenProp = value.GetType().GetProperty("token");
            Assert.NotNull(tokenProp);
            var token = tokenProp.GetValue(value)?.ToString();
            Assert.Equal("dummy_token", token);
        }

        [Fact]
        public async Task Login_ReturnsUnauthorized_WhenUserNotFound()
        {
            var userManagerMock = GetUserManagerMock();
            var signInManagerMock = GetSignInManagerMock(userManagerMock.Object);
            var jwtGeneratorMock = new Mock<IJwtTokenGenerator>();

            var loginModel = new LoginViewModel
            {
                Username = "nonexistent",
                Password = "Password123!"
            };

            userManagerMock.Setup(um => um.FindByNameAsync("nonexistent"))
                .ReturnsAsync((ApplicationUser)null);

            var controller = new AccountController(
                userManagerMock.Object,
                signInManagerMock.Object,
                jwtGeneratorMock.Object);

            var result = await controller.Login(loginModel);

            var unauthorizedResult = Assert.IsType<UnauthorizedObjectResult>(result);
            Assert.Equal("Неверное имя пользователя или пароль", unauthorizedResult.Value);
        }

        [Fact]
        public async Task Login_ReturnsUnauthorized_WhenPasswordIsIncorrect()
        {
            var userManagerMock = GetUserManagerMock();
            var signInManagerMock = GetSignInManagerMock(userManagerMock.Object);
            var jwtGeneratorMock = new Mock<IJwtTokenGenerator>();

            var loginModel = new LoginViewModel
            {
                Username = "testuser",
                Password = "WrongPassword"
            };

            var testUser = new ApplicationUser { Id = "user1", UserName = "testuser" };

            userManagerMock.Setup(um => um.FindByNameAsync("testuser"))
                .ReturnsAsync(testUser);
            signInManagerMock.Setup(sm => sm.CheckPasswordSignInAsync(testUser, loginModel.Password, false))
                .ReturnsAsync(Microsoft.AspNetCore.Identity.SignInResult.Failed);

            var controller = new AccountController(
                userManagerMock.Object,
                signInManagerMock.Object,
                jwtGeneratorMock.Object);

            var result = await controller.Login(loginModel);

            var unauthorizedResult = Assert.IsType<UnauthorizedObjectResult>(result);
            Assert.Equal("Неверное имя пользователя или пароль", unauthorizedResult.Value);
        }

        [Fact]
        public async Task Login_ReturnsBadRequest_WhenModelStateIsInvalid()
        {
            var userManagerMock = GetUserManagerMock();
            var signInManagerMock = GetSignInManagerMock(userManagerMock.Object);
            var jwtGeneratorMock = new Mock<IJwtTokenGenerator>();

            var controller = new AccountController(
                userManagerMock.Object,
                signInManagerMock.Object,
                jwtGeneratorMock.Object);
            controller.ModelState.AddModelError("Error", "Invalid Model");

            var result = await controller.Login(new LoginViewModel());

            Assert.IsType<BadRequestObjectResult>(result);
        }
    }
}
