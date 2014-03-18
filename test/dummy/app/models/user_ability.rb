class UserAbility < DeviseAuthorizable::Ability
  # Add a method for each role you have in your application and add abilities.
  # Check the [README](http://github.com/schneikai/devise_authorizable) on
  # how that works.
  #
  # Remember: There are two build in roles: +guest+ which are users that are
  # not signed in and +authenticated+ which are signed in users.

  def guest
    can :read, :all
  end

  def authenticated
    can :create, :all
    # Only allow update and destroy on own stuff.
    can [:update, :destroy], :all, user_id: user.id
  end

  def admin
    can :manage, :all
  end
end



